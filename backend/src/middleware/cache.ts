/**
 * Simple in-process response cache middleware for Express.
 * Caches GET responses in memory with a configurable TTL.
 *
 * Usage:
 *   router.get('/heavy-route', cache(30), handler);
 */
import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: unknown;
  contentType: string;
  ts: number;
}

const store = new Map<string, CacheEntry>();

/**
 * @param ttlSeconds How long to cache the response (default 30 s)
 */
export function cache(ttlSeconds = 30) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests with no auth side-effects
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const hit = store.get(key);

    if (hit && Date.now() - hit.ts < ttlSeconds * 1000) {
      res.setHeader('Content-Type', hit.contentType || 'application/json');
      res.setHeader('X-Cache', 'HIT');
      res.json(hit.body);
      return;
    }

    // Monkey-patch res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      store.set(key, {
        body,
        contentType: 'application/json',
        ts: Date.now(),
      });
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/** Evict all cache entries whose key starts with the given prefix. */
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Evict everything (e.g., after a write). */
export function clearCache(): void {
  store.clear();
}
