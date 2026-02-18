import React from 'react';
import { currencySymbol, usesDirhamFont } from './currency';

interface FormattedCurrencyProps {
  amount: number;
  currency: string;
  decimals?: number;
  className?: string;
}

/**
 * Renders a formatted currency amount. For AED, the symbol is wrapped
 * in a span with the dirham-symbol class so the custom UAE font is used.
 */
export const FormattedCurrency: React.FC<FormattedCurrencyProps> = ({
  amount,
  currency,
  decimals = 2,
  className = '',
}) => {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      <CurrencySymbolDisplay currency={currency} /> {formatted}
    </span>
  );
};

/**
 * Renders just the currency symbol with proper font styling.
 * Use this when you need to display the symbol separately from the amount.
 */
export const CurrencySymbolDisplay: React.FC<{ currency: string }> = ({ currency }) => {
  const symbol = currencySymbol(currency);
  if (usesDirhamFont(currency)) {
    return <span className="dirham-symbol">{symbol}</span>;
  }
  return <>{symbol}</>;
};
