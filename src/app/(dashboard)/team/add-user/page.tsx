'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AddTeamUserPage() {
  const [name, setName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rank, setRank] = useState(2);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      router.push('/login');
      return;
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, rank')
      .ilike('email', user.email)
      .single();

    if (!currentEmployee || currentEmployee.rank !== 1) {
      router.push('/home');
      return;
    }

    setAuthChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            email: companyEmail, 
            password, 
            name, 
            rank,
            is_admin: false 
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to create user');
        setLoading(false);
        return;
      }

      setSuccess('User created successfully!');
      
      setName('');
      setCompanyEmail('');
      setPassword('');
      setRank(2);

      setTimeout(() => {
        router.push('/team');
        router.refresh();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-white text-[12px] sm:text-[14px] font-light">Team Management</p>
        <h1 className="text-[32px] sm:text-[45px] font-light text-white mt-1">Add New Employee</h1>
        <div className="h-1 w-full max-w-[200px] bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-2"></div>
      </div>

      <div className="bg-[#1E1E1E] rounded-[20px] border border-[#424242] p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="john@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              Minimum 6 characters required
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rank <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              min={1}
              max={10}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Rank 1 = Highest authority (can override points for all). Lower number = higher authority.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="button"
              onClick={() => router.push('/team')}
              className="w-full sm:w-auto px-6 py-3 border border-[#424242] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
            >
              {loading ? 'Creating User...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
