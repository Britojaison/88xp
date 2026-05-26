'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  email: string;
  name: string;
  rank: number | null;
  is_admin: boolean;
  created_at: string;
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      router.push('/login');
      return;
    }

    // Get current user's rank
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, rank')
      .ilike('email', user.email)
      .single();

    if (!currentEmployee || currentEmployee.rank !== 1) {
      // Only rank 1 can access this page
      router.push('/home');
      return;
    }

    setCurrentUserRank(currentEmployee.rank);
    fetchEmployees();
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('is_admin', false)
      .order('rank');
    setEmployees(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Session expired. Please log in again.');
        return;
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ employeeId: id }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        alert(`Failed to delete employee: ${result.error || 'Unknown error'}`);
        return;
      }
      
      fetchEmployees();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete employee'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (currentUserRank !== 1) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <p className="text-white text-[12px] sm:text-[14px] font-light">Manage team members and ranks</p>
          <h1 className="text-[32px] sm:text-[45px] lg:text-[55px] font-light text-white mt-1">Team Management</h1>
          <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full"></div>
        </div>

        <button
          onClick={() => router.push('/team/add-user')}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-[20px] transition-colors text-sm sm:text-base border border-white/20 sm:mt-8 flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> Add Employee
        </button>
      </div>

      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden bg-[#1E1E1E]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm sm:text-base text-left text-white">
            <thead className="bg-[#2A2A2A] text-gray-300">
              <tr>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Rank</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#424242]/50">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-400">
                    No employees yet. Click &quot;Add Employee&quot; to create one.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#2A2A2A]/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-medium flex items-center gap-3">
                      <div className="w-[30px] h-[30px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&size=30`}
                          alt={emp.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {emp.name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-400 hidden sm:table-cell truncate max-w-[200px]">{emp.email}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs sm:text-sm px-2 py-1 rounded">
                        Rank {emp.rank}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <button
                          onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }}
                          className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm text-left transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="text-red-400 hover:text-red-300 text-xs sm:text-sm text-left transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => { setShowEditModal(false); setEditingEmployee(null); }}
          onSaved={fetchEmployees}
        />
      )}
    </div>
  );
}


function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(employee.name);
  const [rank, setRank] = useState(employee.rank || 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ name, rank })
        .eq('id', employee.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-[#1E1E1E] border border-[#424242] rounded-[20px] p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-white">Edit Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={employee.email}
              className="w-full bg-[#1A1A1A] border border-[#333] text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rank</label>
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
              className="w-full bg-[#2A2A2A] border border-[#424242] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              min={1}
              max={10}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Rank 1 = Highest authority. Lower number = higher authority.
            </p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
