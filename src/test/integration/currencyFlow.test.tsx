/**
 * Integration tests: currency utilities + FormattedCurrency component
 * working together in a realistic rendering scenario.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { FormattedCurrency } from '../../utils/FormattedCurrency';
import { fmtCurrency, currencySymbol } from '../../utils/currency';

const currencies = ['LKR', 'CNY', 'AED'] as const;
const amounts = [0, 1, 100, 1500.5, 1_000_000];

describe('Currency integration: symbol consistency', () => {
  currencies.forEach((currency) => {
    amounts.forEach((amount) => {
      it(`${currency} ${amount} – symbol matches between utility and component`, () => {
        const utilSymbol = currencySymbol(currency);
        const { container } = render(
          React.createElement(FormattedCurrency, { amount, currency })
        );
        expect(container.textContent).toContain(utilSymbol);
      });
    });
  });
});

describe('Currency integration: formatting', () => {
  it('fmtCurrency and FormattedCurrency agree on LKR 1,500.00', () => {
    const utilResult = fmtCurrency(1500, 'LKR');
    const { container } = render(
      React.createElement(FormattedCurrency, { amount: 1500, currency: 'LKR' })
    );
    expect(utilResult).toContain('1,500.00');
    expect(container.textContent).toContain('1,500.00');
  });

  it('handles very large amounts without throwing', () => {
    expect(() => fmtCurrency(Number.MAX_SAFE_INTEGER, 'LKR')).not.toThrow();
    expect(() =>
      render(React.createElement(FormattedCurrency, { amount: Number.MAX_SAFE_INTEGER, currency: 'LKR' }))
    ).not.toThrow();
  });

  it('rounds AED decimal to 2 places', () => {
    const result = fmtCurrency(9.999, 'AED', 2);
    expect(result).toContain('10.00');
  });
});
