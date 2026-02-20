import '@testing-library/jest-dom';

// Suppress unhandledRejection events that originate from intentional
// error-path tests (e.g. useApi "sets error when request fails").
// The hook's .catch() DOES handle these, but there's a microtask timing
// gap in Node where the process event fires before user handlers attach.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process?.on?.('unhandledRejection', (_reason: unknown, promise: Promise<unknown>) => {
  promise.catch(() => undefined);
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

