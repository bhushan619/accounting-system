import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...actual.default,
      post: vi.fn(),
      defaults: { headers: { common: {} } },
      interceptors: {
        response: { use: vi.fn(() => 1), eject: vi.fn() },
      },
    },
  };
});

const mockedPost = vi.mocked(axios.post);

// Helper component
function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return React.createElement('div', null, 'Loading…');
  return React.createElement(
    'div',
    null,
    React.createElement('div', { 'data-testid': 'user' }, user ? user.email : 'no-user'),
    React.createElement('div', { 'data-testid': 'role' }, user?.role ?? ''),
    React.createElement('button', {
      onClick: () => login('admin@test.com', 'password').catch(() => {})
    }, 'Login'),
    React.createElement('button', { onClick: logout }, 'Logout'),
  );
}

function renderWithAuth() {
  return render(
    React.createElement(AuthProvider, null, React.createElement(TestConsumer))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockedPost.mockRejectedValue(Object.assign(new Error('401'), { response: { status: 401 } }));
});

describe('AuthProvider', () => {
  it('shows no-user when no token is stored', async () => {
    const { getByTestId } = renderWithAuth();
    await waitFor(() => expect(getByTestId('user').textContent).toBe('no-user'));
  });

  it('login sets user and stores token in localStorage', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        access: 'fake-jwt-token',
        user: { id: '1', email: 'admin@test.com', role: 'admin', fullName: 'Admin' },
      },
    });

    const user = userEvent.setup();
    const { getByText, getByTestId } = renderWithAuth();
    await waitFor(() => getByText('Login'));

    await user.click(getByText('Login'));

    await waitFor(() => expect(getByTestId('user').textContent).toBe('admin@test.com'));
    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    expect(getByTestId('role').textContent).toBe('admin');
  });

  it('login failure leaves user as null', async () => {
    mockedPost.mockRejectedValueOnce(
      Object.assign(new Error('Invalid credentials'), {
        response: { data: { error: 'Invalid credentials' } },
      })
    );

    const user = userEvent.setup();
    const { getByText, getByTestId } = renderWithAuth();
    await waitFor(() => getByText('Login'));

    await user.click(getByText('Login'));

    await waitFor(() => expect(getByTestId('user').textContent).toBe('no-user'));
  });

  it('logout clears token from localStorage', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        access: 'fake-jwt-token',
        user: { id: '1', email: 'admin@test.com', role: 'admin' },
      },
    });

    const user = userEvent.setup();
    const { getByText, getByTestId } = renderWithAuth();
    await waitFor(() => getByText('Login'));
    await user.click(getByText('Login'));
    await waitFor(() => expect(getByTestId('user').textContent).toBe('admin@test.com'));

    await user.click(getByText('Logout'));
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('useAuth outside provider', () => {
  it('throws if used outside AuthProvider', () => {
    function BrokenConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(React.createElement(BrokenConsumer))).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });
});
