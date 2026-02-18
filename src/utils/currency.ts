/**
 * Returns the display symbol for a currency code.
 * LKR → "Rs.", CNY → "¥", others → code as-is (e.g. "AED")
 */
export const currencySymbol = (code: string): string => {
  switch (code) {
    case 'LKR': return 'Rs.';
    case 'CNY': return '¥';
    default: return code;
  }
};

/**
 * Formats an amount with the proper currency symbol.
 * e.g. fmtCurrency(1500, 'LKR') → "Rs. 1,500.00"
 */
export const fmtCurrency = (amount: number, currency: string, decimals = 2): string => {
  return `${currencySymbol(currency)} ${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};
