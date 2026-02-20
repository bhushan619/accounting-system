import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

// Reset localStorage before each test so language doesn't leak between tests
beforeEach(() => {
  localStorage.clear();
});

// Each test gets its own fresh provider to avoid state leaking
function renderSwitcher(props: { collapsed?: boolean; variant?: 'sidebar' | 'light' } = {}) {
  return render(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(LanguageSwitcher, props)
    )
  );
}

describe('LanguageSwitcher', () => {
  it('renders the current language label (English by default)', () => {
    const { container } = renderSwitcher();
    expect(container.textContent).toContain('English');
  });

  it('toggles from English to Chinese on click', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = renderSwitcher();

    await user.click(getByRole('button'));

    expect(container.textContent).toContain('中文');
  });

  it('toggles back to English on second click', async () => {
    const user = userEvent.setup();
    const { container, getByRole } = renderSwitcher();

    await user.click(getByRole('button')); // EN → ZH
    await user.click(getByRole('button')); // ZH → EN

    expect(container.textContent).toContain('English');
  });

  it('hides the label text when collapsed=true', () => {
    const { container } = renderSwitcher({ collapsed: true });
    expect(container.textContent?.trim()).toBe('');
  });

  it('shows the label when collapsed=false (default)', () => {
    const { container } = renderSwitcher({ collapsed: false });
    expect(container.textContent).toContain('English');
  });

  it('applies sidebar variant classes by default', () => {
    const { container } = renderSwitcher();
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('sidebar-foreground');
  });

  it('applies light variant classes when variant="light"', () => {
    const { container } = renderSwitcher({ variant: 'light' });
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('text-foreground');
    expect(btn?.className).not.toContain('sidebar-foreground');
  });

  it('includes a title attribute when collapsed', () => {
    const { container } = renderSwitcher({ collapsed: true });
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('title')).toBeTruthy();
  });
});
