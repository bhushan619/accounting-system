import { useState, useEffect } from 'react';
import axios from 'axios';

export type SupportedCurrency = 'LKR' | 'AED' | 'CNY';

let cachedBaseCurrency: SupportedCurrency | null = null;
let fetchPromise: Promise<SupportedCurrency> | null = null;

const fetchBaseCurrency = async (): Promise<SupportedCurrency> => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/settings/currency`);
    const base = res.data?.baseCurrency || res.data?.data?.baseCurrency;
    if (base && ['LKR', 'AED', 'CNY'].includes(base)) {
      cachedBaseCurrency = base as SupportedCurrency;
      return cachedBaseCurrency;
    }
  } catch {
    // Fall back to company settings
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/settings/company`);
      const currency = res.data?.currency;
      if (currency && ['LKR', 'AED', 'CNY'].includes(currency)) {
        cachedBaseCurrency = currency as SupportedCurrency;
        return cachedBaseCurrency;
      }
    } catch {
      // ignore
    }
  }
  cachedBaseCurrency = 'LKR';
  return 'LKR';
};

/**
 * Returns the base/default currency from settings.
 * Caches the result so only one API call is made per session.
 */
export function useDefaultCurrency(): SupportedCurrency {
  const [currency, setCurrency] = useState<SupportedCurrency>(cachedBaseCurrency || 'LKR');

  useEffect(() => {
    if (cachedBaseCurrency) {
      setCurrency(cachedBaseCurrency);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchBaseCurrency();
    }
    fetchPromise.then((c) => setCurrency(c));
  }, []);

  return currency;
}

/** Invalidate the cache (e.g. after updating settings) */
export function invalidateDefaultCurrency() {
  cachedBaseCurrency = null;
  fetchPromise = null;
}
