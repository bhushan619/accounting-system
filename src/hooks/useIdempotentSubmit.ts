import { useState, useRef, useCallback } from 'react';
import { generateIdempotencyKey } from './useApi';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL as string;

/**
 * Hook for idempotent form submissions.
 * Generates a unique idempotency key per submission attempt,
 * prevents double-clicks, and auto-resets the key after success.
 *
 * Usage:
 *   const { submit, submitting } = useIdempotentSubmit();
 *   await submit('POST', '/invoices', formData);
 */
export function useIdempotentSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef<string>(generateIdempotencyKey());

  const submit = useCallback(async <T = unknown>(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    body?: unknown,
    axiosConfig?: Record<string, any>
  ): Promise<T> => {
    if (submitting) throw new Error('Submission already in progress');
    setSubmitting(true);
    try {
      const url = `${BASE_URL}${path}`;
      const response = await axios({
        method,
        url,
        data: body,
        ...axiosConfig,
        headers: {
          ...axiosConfig?.headers,
          'Idempotency-Key': keyRef.current,
        },
      });
      // Reset key for next submission
      keyRef.current = generateIdempotencyKey();
      return response.data as T;
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  const resetKey = useCallback(() => {
    keyRef.current = generateIdempotencyKey();
  }, []);

  return { submit, submitting, resetKey };
}
