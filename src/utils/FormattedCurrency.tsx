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
  const symbol = currencySymbol(currency);

  if (usesDirhamFont(currency)) {
    return (
      <span className={className}>
        <span className="dirham-symbol">{symbol}</span> {formatted}
      </span>
    );
  }

  return <span className={className}>{symbol} {formatted}</span>;
};
