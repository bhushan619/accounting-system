import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, pw);        // uses AuthContext.login
      navigate('/dashboard');       // now ProtectedRoute will see the token
    } catch (err: any) {
      setError('Login failed. Please check your email and password.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={submit}
        className="bg-white p-6 rounded-lg shadow w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-gray-800">Sign in</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          <label className="block text-sm text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block text-sm text-gray-700">
            Password
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 text-sm font-medium rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
