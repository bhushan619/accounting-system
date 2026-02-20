import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LanguageProvider, useLanguage } from './LanguageContext';

function TestConsumer() {
  const { language, setLanguage, t } = useLanguage();
  return React.createElement(
    'div',
    null,
    React.createElement('div', { 'data-testid': 'lang' }, language),
    React.createElement('div', { 'data-testid': 'nav-dashboard' }, t('nav.dashboard')),
    React.createElement('div', { 'data-testid': 'unknown' }, t('this.key.does.not.exist')),
    React.createElement('button', { onClick: () => setLanguage('zh') }, 'Switch to ZH'),
    React.createElement('button', { onClick: () => setLanguage('en') }, 'Switch to EN'),
  );
}

function renderWithLanguage() {
  return render(
    React.createElement(LanguageProvider, null, React.createElement(TestConsumer))
  );
}

describe('LanguageProvider', () => {
  it('defaults to English', () => {
    const { getByTestId } = renderWithLanguage();
    expect(getByTestId('lang').textContent).toBe('en');
  });

  it('returns the English translation for nav.dashboard', () => {
    const { getByTestId } = renderWithLanguage();
    expect(getByTestId('nav-dashboard').textContent).toBe('Dashboard');
  });

  it('switches to Chinese and returns correct translation', async () => {
    const user = userEvent.setup();
    const { getByText, getByTestId } = renderWithLanguage();

    await user.click(getByText('Switch to ZH'));

    expect(getByTestId('lang').textContent).toBe('zh');
    expect(getByTestId('nav-dashboard').textContent).toBe('仪表板');
  });

  it('switches back to English', async () => {
    const user = userEvent.setup();
    const { getByText, getByTestId } = renderWithLanguage();

    await user.click(getByText('Switch to ZH'));
    await user.click(getByText('Switch to EN'));

    expect(getByTestId('lang').textContent).toBe('en');
    expect(getByTestId('nav-dashboard').textContent).toBe('Dashboard');
  });

  it('t() returns the key itself for unknown keys', () => {
    const { getByTestId } = renderWithLanguage();
    expect(getByTestId('unknown').textContent).toBe('this.key.does.not.exist');
  });
});
