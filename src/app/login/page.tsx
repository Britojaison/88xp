'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockLogin } from '@/lib/mock-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = mockLogin(email, password);

    if (!result.success) {
      setError(result.error || 'Login failed');
      setLoading(false);
      return;
    }

    router.push('/home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Employee Dashboard</h1>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="font-medium text-blue-800 mb-2">Mock Login Credentials:</p>
          <ul className="text-blue-700 space-y-1">
            <li>admin@test.com (Admin, Rank 1)</li>
            <li>john@test.com (Rank 2)</li>
            <li>jane@test.com (Rank 3)</li>
            <li>bob@test.com (Rank 4)</li>
          </ul>
          <p className="mt-2 text-blue-600">Password: password</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
