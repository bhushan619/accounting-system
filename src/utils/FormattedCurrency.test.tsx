import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { FormattedCurrency, CurrencySymbolDisplay } from './FormattedCurrency';

describe('FormattedCurrency', () => {
  it('renders amount with LKR symbol', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 1500, currency: 'LKR' }));
    expect(container.textContent).toContain('Rs.');
    expect(container.textContent).toContain('1,500');
  });

  it('renders amount with CNY symbol', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 200, currency: 'CNY' }));
    expect(container.textContent).toContain('¥');
    expect(container.textContent).toContain('200');
  });

  it('renders AED symbol wrapped in .dirham-symbol span', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 99, currency: 'AED' }));
    const dirhamSpan = container.querySelector('.dirham-symbol');
    expect(dirhamSpan).not.toBeNull();
    expect(dirhamSpan?.textContent).toBe('\u00EA');
  });

  it('applies default 2 decimal places', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 1000, currency: 'LKR' }));
    expect(container.textContent).toContain('1,000.00');
  });

  it('respects custom decimals prop of 0', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 1000, currency: 'LKR', decimals: 0 }));
    // With 0 decimals, text should end in digits without ".00"
    expect(container.textContent).not.toContain('.00');
    expect(container.textContent).toContain('1,000');
  });

  it('applies custom className to the outer span', () => {
    const { container } = render(
      React.createElement(FormattedCurrency, { amount: 10, currency: 'LKR', className: 'my-class' })
    );
    const span = container.firstElementChild;
    expect(span?.classList.contains('my-class')).toBe(true);
  });

  it('renders zero correctly', () => {
    const { container } = render(React.createElement(FormattedCurrency, { amount: 0, currency: 'LKR' }));
    expect(container.textContent).toContain('0.00');
  });
});

describe('CurrencySymbolDisplay', () => {
  it('renders "Rs." for LKR without a .dirham-symbol wrapper', () => {
    const { container } = render(React.createElement(CurrencySymbolDisplay, { currency: 'LKR' }));
    expect(container.textContent).toBe('Rs.');
    expect(container.querySelector('.dirham-symbol')).toBeNull();
  });

  it('wraps AED symbol in .dirham-symbol span', () => {
    const { container } = render(React.createElement(CurrencySymbolDisplay, { currency: 'AED' }));
    const span = container.querySelector('.dirham-symbol');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('\u00EA');
  });

  it('renders "¥" for CNY without a .dirham-symbol wrapper', () => {
    const { container } = render(React.createElement(CurrencySymbolDisplay, { currency: 'CNY' }));
    expect(container.textContent).toBe('¥');
    expect(container.querySelector('.dirham-symbol')).toBeNull();
  });

  it('renders the code itself for unknown currency', () => {
    const { container } = render(React.createElement(CurrencySymbolDisplay, { currency: 'USD' }));
    expect(container.textContent).toBe('USD');
  });
});
