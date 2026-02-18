/**
 * Returns the display symbol for a currency code.
 * LKR → "Rs.", CNY → "¥", AED → dirham symbol (ê in UAESymbol font), others → code as-is
 */
export const currencySymbol = (code: string): string => {
  switch (code) {
    case 'LKR': return 'Rs.';
    case 'CNY': return '¥';
    case 'AED': return '\u00EA'; // ê character renders as Dirham symbol in UAESymbol font
    default: return code;
  }
};

/**
 * Check if a currency uses the custom dirham font
 */
export const usesDirhamFont = (code: string): boolean => code === 'AED';

/**
 * Formats an amount with the proper currency symbol.
 * e.g. fmtCurrency(1500, 'LKR') → "Rs. 1,500.00"
 * For AED, returns the formatted string (caller should wrap symbol in .dirham-symbol span)
 */
export const fmtCurrency = (amount: number, currency: string, decimals = 2): string => {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${currencySymbol(currency)} ${formatted}`;
};
