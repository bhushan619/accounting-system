import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import { useApi, invalidateCache } from './useApi';

// Mock axios entirely
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...actual.default,
      get: vi.fn(),
      defaults: { headers: { common: {} } },
      interceptors: {
        response: { use: vi.fn(() => 1), eject: vi.fn() },
      },
    },
  };
});

const mockedGet = vi.mocked(axios.get);

beforeEach(() => {
  vi.clearAllMocks();
  invalidateCache('/');
});

describe('useApi', () => {
  it('returns loading=true initially then resolves data', async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ id: 1, name: 'Test' }] } as any);

    const { result } = renderHook(() => useApi<{ id: number; name: string }[]>('/invoices'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when request fails', async () => {
    mockedGet.mockRejectedValueOnce({ response: { data: { error: 'Unauthorized' } } });

    const { result } = renderHook(() => useApi('/invoices-fail'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Unauthorized');
  });

  it('does not fetch when path is null', () => {
    const { result } = renderHook(() => useApi(null));
    expect(result.current.loading).toBe(false);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('uses cache and does not re-fetch within TTL', async () => {
    mockedGet.mockResolvedValue({ data: { value: 42 } } as any);

    const { result, rerender } = renderHook(() => useApi('/cached-path'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('refetch clears cache and re-fetches', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { count: 1 } } as any)
      .mockResolvedValueOnce({ data: { count: 2 } } as any);

    const { result } = renderHook(() => useApi<{ count: number }>('/refetch-path'));
    await waitFor(() => expect(result.current.data?.count).toBe(1));

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data?.count).toBe(2));

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('appends query params to the URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as any);

    renderHook(() => useApi('/expenses', { params: { page: 1, status: 'approved' } }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('status=approved');
  });

  it('omits undefined params from the URL', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] } as any);

    renderHook(() => useApi('/expenses-filter', { params: { page: 1, status: undefined } }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('status');
  });
});

describe('invalidateCache', () => {
  it('is callable without throwing', () => {
    expect(() => invalidateCache('/invoices')).not.toThrow();
  });
});
