import { describe, it, expect } from 'vitest';
import { currencySymbol, usesDirhamFont, fmtCurrency } from './currency';

// ─── currencySymbol ────────────────────────────────────────────────────────────
describe('currencySymbol', () => {
  it('returns "Rs." for LKR', () => {
    expect(currencySymbol('LKR')).toBe('Rs.');
  });

  it('returns "¥" for CNY', () => {
    expect(currencySymbol('CNY')).toBe('¥');
  });

  it('returns the dirham unicode character for AED', () => {
    expect(currencySymbol('AED')).toBe('\u00EA');
  });

  it('returns the currency code itself for unknown codes', () => {
    expect(currencySymbol('USD')).toBe('USD');
    expect(currencySymbol('EUR')).toBe('EUR');
    expect(currencySymbol('')).toBe('');
  });

  it('is case-sensitive (lowercase codes fall through to default)', () => {
    expect(currencySymbol('lkr')).toBe('lkr');
    expect(currencySymbol('aed')).toBe('aed');
  });
});

// ─── usesDirhamFont ───────────────────────────────────────────────────────────
describe('usesDirhamFont', () => {
  it('returns true only for AED', () => {
    expect(usesDirhamFont('AED')).toBe(true);
  });

  it('returns false for LKR', () => {
    expect(usesDirhamFont('LKR')).toBe(false);
  });

  it('returns false for CNY', () => {
    expect(usesDirhamFont('CNY')).toBe(false);
  });

  it('returns false for unknown codes', () => {
    expect(usesDirhamFont('USD')).toBe(false);
    expect(usesDirhamFont('')).toBe(false);
  });
});

// ─── fmtCurrency ──────────────────────────────────────────────────────────────
describe('fmtCurrency', () => {
  it('formats LKR amounts with "Rs." prefix', () => {
    const result = fmtCurrency(1500, 'LKR');
    expect(result).toMatch(/^Rs\./);
    expect(result).toContain('1,500');
  });

  it('formats CNY amounts with "¥" prefix', () => {
    const result = fmtCurrency(200, 'CNY');
    expect(result).toMatch(/^¥/);
  });

  it('formats AED amounts with the dirham character prefix', () => {
    const result = fmtCurrency(99.99, 'AED');
    expect(result.startsWith('\u00EA')).toBe(true);
  });

  it('applies default 2 decimal places', () => {
    expect(fmtCurrency(1000, 'LKR')).toContain('1,000.00');
  });

  it('respects custom decimal places', () => {
    const zeroDecimals = fmtCurrency(1000, 'LKR', 0);
    // With 0 decimals, there should be no decimal separator (no period before digits)
    expect(zeroDecimals).toMatch(/Rs\. 1[,.]?000$/);
    expect(fmtCurrency(1000, 'LKR', 3)).toContain('1,000.000');
  });

  it('formats zero correctly', () => {
    const result = fmtCurrency(0, 'LKR');
    expect(result).toContain('0.00');
  });

  it('formats negative amounts', () => {
    const result = fmtCurrency(-500, 'LKR');
    expect(result).toContain('-');
    expect(result).toContain('500');
  });

  it('formats large amounts with commas', () => {
    const result = fmtCurrency(1_000_000, 'LKR');
    expect(result).toContain('1,000,000');
  });
});
