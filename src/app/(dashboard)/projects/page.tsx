'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CreateProjectModal from '@/components/CreateProjectModal';

interface Task {
  id: string;
  name: string;
  status: string;
  points_override: number | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  assigned_to: string;
  type: { id: string; name: string; points: number } | null;
  creator: { id: string; name: string; rank: number | null } | null;
  assignee: { id: string; name: string; rank: number | null } | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  rank: number | null;
}

type StatusFilter = 'all' | 'ongoing' | 'completed';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TasksPage() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number | null; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Override state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [overridePoints, setOverridePoints] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data: employee } = await supabase
      .from('employees')
      .select('id, rank, is_admin')
      .ilike('email', user.email)
      .single();

    if (!employee) {
      setLoading(false);
      return;
    }

    if (employee.is_admin) {
      router.push('/admin');
      return;
    }

    setCurrentUser(employee);

    const transform = (p: Record<string, unknown>) => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    });

    const { data: employeeRows } = await supabase
      .from('employees')
      .select('id, name, rank')
      .eq('is_admin', false)
      .order('rank', { ascending: true });
    setEmployees((employeeRows || []) as EmployeeOption[]);

    const { data: tasks } = await supabase
      .from('projects')
      .select('*, type:project_types(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
      .order('created_at', { ascending: false });

    setAllTasks((tasks || []).map(transform) as Task[]);
    setLoading(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from('projects').update(updates).eq('id', taskId);
    fetchData();
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await supabase.from('projects').delete().eq('id', taskId);
    fetchData();
  };

  const handleOverridePoints = async (taskId: string) => {
    setSaving(true);
    await supabase.from('projects').update({ points_override: overridePoints }).eq('id', taskId);
    setSaving(false);
    setEditingTaskId(null);
    fetchData();
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setOverridePoints(task.points_override ?? task.type?.points ?? 0);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setOverridePoints(0);
  };

  const isOngoing = (t: Task) => t.status === 'pending' || t.status === 'in_progress';
  const isCompleted = (t: Task) => t.status === 'completed' || t.status === 'approved';
  
  // Only Rank 1 can override points on completed tasks
  const isRank1 = currentUser?.rank === 1;
  const canOverridePoints = (task: Task) => isRank1 && isCompleted(task);

  const filteredTasks = allTasks.filter((task) => {
    if (employeeFilter !== 'all' && task.assigned_to !== employeeFilter) return false;
    if (statusFilter === 'ongoing' && !isOngoing(task)) return false;
    if (statusFilter === 'completed' && !isCompleted(task)) return false;
    
    if (yearFilter !== 'all' || monthFilter !== 'all') {
      const dateStr = task.completed_at || task.created_at;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (yearFilter !== 'all' && date.getFullYear() !== Number(yearFilter)) return false;
      if (monthFilter !== 'all' && date.getMonth() + 1 !== Number(monthFilter)) return false;
    }
    return true;
  });

  const ongoingTasks = filteredTasks.filter(isOngoing);
  const completedTasks = filteredTasks.filter(isCompleted);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      approved: { bg: 'bg-violet-100', text: 'text-violet-700' },
    };
    const style = config[status] || config.pending;
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPoints = (task: Task) => task.points_override ?? task.type?.points ?? 0;
  const hasOverride = (task: Task) => task.points_override !== null;

  const canMarkComplete = (task: Task) => 
    currentUser?.id === task.assigned_to && !isCompleted(task);

  const canDelete = (task: Task) => currentUser?.id === task.created_by;

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage all tasks in one place</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg"
        >
          + Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Employee:</span>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex rounded-lg border overflow-hidden">
            {(['all', 'ongoing', 'completed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm capitalize ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                } ${s !== 'all' ? 'border-l' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Year:</span>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              if (e.target.value === 'all') setMonthFilter('all');
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {yearFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Month:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <span className="ml-auto text-sm text-gray-500">
          Total: <span className="font-semibold">{filteredTasks.length}</span> tasks
        </span>
      </div>

      {/* Rank Badge */}
      {currentUser?.rank && (
        <div className={`rounded-xl p-4 text-white ${isRank1 ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isRank1 ? 'text-amber-100' : 'text-indigo-100'}`}>Your Rank</p>
              <p className="text-2xl font-bold">#{currentUser.rank}</p>
            </div>
            {isRank1 && (
              <p className="text-sm text-amber-100">
                ✨ You can override points for any completed task
              </p>
            )}
          </div>
        </div>
      )}


      {/* Ongoing Tasks Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h2 className="text-lg font-semibold text-gray-900">Ongoing Tasks</h2>
          </div>
          <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
            {ongoingTasks.length}
          </span>
        </div>
        {ongoingTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No ongoing tasks</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Task Name</th>
                  <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium">Created By</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-center font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ongoingTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{task.name}</td>
                    <td className="px-4 py-3 text-gray-600">{task.assignee?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{task.creator?.name || '-'}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(task.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {task.type?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {getPoints(task)} pts
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canMarkComplete(task) && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'completed')}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                          >
                            Complete
                          </button>
                        )}
                        {canDelete(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed Tasks Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <h2 className="text-lg font-semibold text-gray-900">Completed Tasks</h2>
          </div>
          <span className="bg-emerald-600 text-white text-sm font-bold px-3 py-1 rounded-full">
            {completedTasks.length}
          </span>
        </div>
        {completedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No completed tasks</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Task Name</th>
                  <th className="px-4 py-3 text-left font-medium">Completed By</th>
                  <th className="px-4 py-3 text-left font-medium">Created By</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-center font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Completed</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{task.name}</td>
                    <td className="px-4 py-3 text-gray-600">{task.assignee?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{task.creator?.name || '-'}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(task.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {task.type?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={overridePoints}
                            onChange={(e) => setOverridePoints(Number(e.target.value))}
                            className="w-16 border rounded px-2 py-1 text-center text-sm"
                            min={0}
                            autoFocus
                          />
                          <button
                            onClick={() => handleOverridePoints(task.id)}
                            disabled={saving}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                          >
                            {saving ? '...' : '✓'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-semibold ${hasOverride(task) ? 'text-orange-600' : 'text-emerald-600'}`}>
                            +{getPoints(task)} pts
                            {hasOverride(task) && <span className="ml-1 text-xs">✎</span>}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {task.completed_at 
                        ? new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isRank1 && editingTaskId !== task.id && (
                          <button
                            onClick={() => startEditing(task)}
                            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded"
                          >
                            Override
                          </button>
                        )}
                        {canDelete(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && currentUser && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={fetchData}
          currentUserId={currentUser.id}
          currentUserRank={currentUser.rank ?? 999}
        />
      )}
    </div>
  );
}
