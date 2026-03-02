/**
 * Idempotency middleware – prevents duplicate mutations when the client
 * sends the same `Idempotency-Key` header more than once.
 *
 * Stored in-memory with a configurable TTL (default 24 h).
 */

interface CachedResponse {
  status: number;
  body: unknown;
  ts: number;
}

const store = new Map<string, CachedResponse | 'processing'>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry !== 'processing' && now - entry.ts > DEFAULT_TTL_MS) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Express middleware factory.
 * Apply to POST/PUT/PATCH routes that should be idempotent.
 */
export function idempotent() {
  return (req: any, res: any, next: any) => {
    const key = req.headers['idempotency-key'] as string | undefined;

    // If no key provided, skip idempotency check
    if (!key) return next();

    // Scope key per user to avoid cross-user collisions
    const scopedKey = `${req.user?._id || 'anon'}:${key}`;

    const cached = store.get(scopedKey);

    // Already completed – return cached response
    if (cached && cached !== 'processing') {
      res.status(cached.status).json(cached.body);
      return;
    }

    // Currently being processed by another in-flight request
    if (cached === 'processing') {
      res.status(409).json({ error: 'Duplicate request is already being processed. Please retry shortly.' });
      return;
    }

    // Mark as processing
    store.set(scopedKey, 'processing');

    // Intercept res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      store.set(scopedKey, { status: res.statusCode, body, ts: Date.now() });
      return originalJson(body);
    };

    // Clean up on error / connection close
    res.on('close', () => {
      const entry = store.get(scopedKey);
      if (entry === 'processing') {
        store.delete(scopedKey); // Request didn't complete, allow retry
      }
    });

    next();
  };
}
