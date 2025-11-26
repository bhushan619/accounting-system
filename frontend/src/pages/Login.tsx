import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, pw, fullName);
      } else {
        await login(email, pw);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(isSignup ? 'Signup failed. Please try again.' : 'Login failed. Please check your email and password.');
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
        <h1 className="text-xl font-semibold text-gray-800">
          {isSignup ? 'Create Account' : 'Sign in'}
        </h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {isSignup && (
            <label className="block text-sm text-gray-700">
              Full Name
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2 text-sm"
              />
            </label>
          )}

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
              minLength={8}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 text-sm font-medium rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? (isSignup ? 'Creating account…' : 'Signing in…') : (isSignup ? 'Sign up' : 'Sign in')}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError(null);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
