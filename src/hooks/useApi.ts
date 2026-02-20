/**
 * useApi – lightweight data-fetching hook with caching, deduplication and
 * automatic token injection via axios defaults.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi<Invoice[]>('/invoices');
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string;

// Simple in-memory cache: key → { data, ts }
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30_000; // 30 s

// Pending promise store to prevent duplicate in-flight requests
const pending = new Map<string, Promise<unknown>>();

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  path: string | null,
  options?: { ttl?: number; params?: Record<string, string | number | undefined> }
): UseApiResult<T> {
  const { ttl = CACHE_TTL_MS, params } = options ?? {};

  // Build full URL with query params
  const url = path
    ? `${BASE_URL}${path}${params ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString() : ''}`
    : null;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) { setLoading(false); return; }

    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < ttl) {
      setData(cached.data as T);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    let req = pending.get(url) as Promise<T> | undefined;
    if (!req) {
      const axiosPromise = axios.get<T>(url);
      // Pre-handle the base axios promise to prevent Node's unhandledRejection
      // from firing before the derived promise's .catch() can attach.
      axiosPromise.catch(() => undefined);
      req = axiosPromise.then(r => r.data) as Promise<T>;
      pending.set(url, req);
      req.finally(() => pending.delete(url));
    }

    req
      .then((result) => {
        cache.set(url, { data: result, ts: Date.now() });
        if (mounted.current) {
          setData(result as T);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted.current) {
          setError(err?.response?.data?.error ?? err.message ?? 'Request failed');
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  const refetch = useCallback(() => {
    if (url) cache.delete(url);
    setTick(t => t + 1);
  }, [url]);

  return { data, loading, error, refetch };
}

/** Imperatively fetch (for mutations / one-off calls). */
export async function apiFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await axios({ method, url, data: body });
  return response.data as T;
}

/** Invalidate cached entries matching a path prefix. */
export function invalidateCache(pathPrefix: string): void {
  const prefix = `${BASE_URL}${pathPrefix}`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
