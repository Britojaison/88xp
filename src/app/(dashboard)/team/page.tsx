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
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [reportEmployee, setReportEmployee] = useState<Employee | null>(null);
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
                          onClick={() => { setReportEmployee(emp); setShowReportModal(true); }}
                          className="text-green-400 hover:text-green-300 text-xs sm:text-sm text-left transition-colors"
                        >
                          Report
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

      {showReportModal && reportEmployee && (
        <EmployeeReportModal
          employee={reportEmployee}
          onClose={() => { setShowReportModal(false); setReportEmployee(null); }}
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

function EmployeeReportModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [targetPoints, setTargetPoints] = useState(100);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchReportData();
  }, [employee.id]);

  const fetchReportData = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999).toISOString();

    // 1. Fetch Target Points
    const { data: targetData } = await supabase
      .rpc('get_or_create_monthly_target', {
        p_employee_id: employee.id,
        p_month: currentMonth,
        p_year: currentYear,
      });

    // 2. Fetch Earned Points
    const { data: scoreData } = await supabase
      .from('monthly_scores')
      .select('total_points')
      .eq('employee_id', employee.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    // 3. Fetch Projects created or completed in this month
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, status, created_at, completed_at, points_override, type:project_types(name, points)')
      .eq('assigned_to', employee.id)
      .or(`and(completed_at.gte.${startDate},completed_at.lte.${endDate}),and(status.in.(pending,in_progress),created_at.lte.${endDate},created_at.gte.${startDate})`)
      .order('created_at', { ascending: false });

    // Ensure type relates properly since project_types might return an array if improperly joined in postgrest
    const transformedProjects = (projectsData || []).map(p => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    }));

    // RPC returns scalar or object depending on definition, handle gracefully
    const tPoints = targetData && typeof targetData === 'object' && 'target_points' in targetData 
        ? Number((targetData as any).target_points) 
        : Number(targetData) || 100;

    setTargetPoints(tPoints);
    setEarnedPoints(scoreData?.total_points ?? 0);
    setProjects(transformedProjects);
    setLoading(false);
  };

  const progressPercentage = Math.min(100, targetPoints > 0 ? (earnedPoints / targetPoints) * 100 : 0);
  const isTargetMet = earnedPoints >= targetPoints;

  const getPoints = (project: any) => project.points_override ?? project.type?.points ?? 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] px-4 py-8">
      <div className="bg-[#1E1E1E] border border-[#424242] rounded-[20px] p-6 w-full max-w-4xl mx-auto max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{employee.name}&apos;s Report</h2>
            <p className="text-sm text-gray-400">Current Month Overview</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Target Points</p>
                <p className="text-2xl font-bold text-white">{targetPoints}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Earned Points</p>
                <p className="text-2xl font-bold text-emerald-400">{earnedPoints.toFixed(1)}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#424242]">
                <p className="text-sm text-gray-400 mb-1">Status</p>
                {isTargetMet ? (
                  <p className="text-2xl font-bold text-green-400">Target Met</p>
                ) : (
                  <p className="text-2xl font-bold text-orange-400">{(targetPoints - earnedPoints).toFixed(1)} to go</p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[#2A2A2A] rounded-xl p-5 border border-[#424242] shrink-0">
               <div className="flex justify-between text-sm text-white mb-2">
                 <span>Progress</span>
                 <span>{progressPercentage.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-[#1A1A1A] rounded-full h-2.5 overflow-hidden">
                 <div 
                   className={`h-2.5 rounded-full transition-all duration-1000 ${isTargetMet ? 'bg-green-500' : 'bg-blue-500'}`} 
                   style={{ width: `${progressPercentage}%` }}
                 ></div>
               </div>
            </div>

            {/* Projects Table */}
            <div className="bg-[#2A2A2A] rounded-xl border border-[#424242] flex flex-col min-h-[300px]">
              <div className="px-4 py-3 border-b border-[#424242] shrink-0">
                <h3 className="text-white font-semibold">Projects Worked On</h3>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-white">
                  <thead className="bg-[#1A1A1A] text-gray-400 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Project Name</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Points</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#424242]">
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No projects found for this month</td>
                      </tr>
                    ) : (
                      projects.map((project) => {
                        const isCompleted = project.status === 'completed' || project.status === 'approved';
                        return (
                          <tr key={project.id} className="hover:bg-[#333]/50 transition-colors">
                            <td className="px-4 py-3 max-w-[200px] sm:max-w-[300px] truncate">{project.name}</td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{project.type?.name || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                               {isCompleted ? (
                                  <span className="text-emerald-400">Completed</span>
                               ) : (
                                  <span className="text-purple-400 capitalize">{project.status.replace('_', ' ')}</span>
                               )}
                            </td>
                            <td className="px-4 py-3 font-medium text-blue-400 whitespace-nowrap">+{getPoints(project).toFixed(1)}</td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                               {isCompleted && project.completed_at 
                                 ? new Date(project.completed_at).toLocaleDateString()
                                 : new Date(project.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
