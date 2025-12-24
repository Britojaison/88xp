'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CreateProjectModal from '@/components/CreateProjectModal';
import CompletionModal from '@/components/CompletionModal';
import BrandManagement from '@/components/BrandManagement';
import { ClipboardIcon, CheckIcon, RefreshCwIcon, CheckCircleIcon, PencilIcon } from 'lucide-react';
import EditTaskModal from '@/components/EditTaskModal';
import { canEditTask } from '@/lib/rank-utils';

interface Task {
  id: string;
  name: string;
  status: string;
  points_override: number | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  assigned_to: string;
  deadline: string | null;
  remarks?: string | null;
  type: { id: string; name: string; points: number } | null;
  brand?: { id: string; name: string } | null;
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
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const [yearFilter, setYearFilter] = useState<string>(currentYear.toString());
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth.toString());
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number | null; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Override state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [overridePoints, setOverridePoints] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  
  // Completion modal state
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  
  // Brand management modal state (for rank 1 users)
  const [showBrandManagement, setShowBrandManagement] = useState(false);
  
  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

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
      brand: Array.isArray(p.brand) ? p.brand[0] : p.brand,
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
      .select('*, type:project_types(*), brand:brands(*), creator:employees!created_by(*), assignee:employees!assigned_to(*)')
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

  const handleTaskUpdated = () => {
    fetchData();
    setToast({ message: 'Task updated successfully', type: 'success' });
    setTimeout(() => setToast(null), 3000);
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

  // Sort ongoing tasks: overdue first, then earliest deadline, then created_at
  const sortedOngoingTasks = filteredTasks.filter(isOngoing).sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aDeadline = a.deadline ? new Date(a.deadline) : null;
    const bDeadline = b.deadline ? new Date(b.deadline) : null;
    
    // Check if overdue
    const aOverdue = aDeadline && aDeadline < today;
    const bOverdue = bDeadline && bDeadline < today;
    
    // Overdue tasks first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // If both overdue or both not overdue, sort by deadline
    if (aOverdue && bOverdue) {
      return (aDeadline?.getTime() || 0) - (bDeadline?.getTime() || 0);
    }
    
    // If both not overdue, sort by deadline (earliest first)
    if (aDeadline && bDeadline) {
      return aDeadline.getTime() - bDeadline.getTime();
    }
    
    // If one has deadline and other doesn't, deadline first
    if (aDeadline && !bDeadline) return -1;
    if (!aDeadline && bDeadline) return 1;
    
    // Finally, sort by created_at (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const ongoingTasks = sortedOngoingTasks;
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

  const canEdit = (task: Task) => {
    if (!currentUser) return false;
    return canEditTask(
      currentUser.rank,
      currentUser.id,
      task.creator?.rank ?? null,
      task.created_by,
      task.status,
      currentUser.is_admin
    );
  };

  const getDeadlineDisplay = (task: Task) => {
    if (!task.deadline) return <span className="text-gray-400">-</span>;
    
    const deadlineDate = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const isOverdue = deadlineDate < today && !isCompleted(task);
    const isDueToday = deadlineDate.getTime() === today.getTime();
    
    const dateStr = deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (isOverdue) {
      return <span className="text-red-600 font-medium">Overdue</span>;
    }
    if (isDueToday) {
      return <span className="text-orange-600 font-medium">Due Today</span>;
    }
    
    return <span className="text-gray-600">{dateStr}</span>;
  };

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
        <div className="flex gap-3">
          {/* Brand Management - only for Rank 1 */}
          {isRank1 && (
            <button
              onClick={() => setShowBrandManagement(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Manage Brands
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg"
          >
            + Create Task
          </button>
        </div>
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

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Year:</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">All</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-sm text-gray-500">
          Total: <span className="font-semibold">{filteredTasks.length}</span> tasks
        </span>
      </div>

      {/* Ongoing Tasks Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCwIcon className="w-5 h-5 text-blue-600" />
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
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium">Created By</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-center font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Deadline</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ongoingTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{task.name}</td>
                    <td className="px-4 py-3">
                      {task.brand ? (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {task.brand.name}
                        </span>
                      ) : '-'}
                    </td>
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
                    <td className="px-4 py-3">
                      {getDeadlineDisplay(task)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canMarkComplete(task) && (
                          <button
                            onClick={() => setCompletingTask(task)}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all"
                          >
                            Complete
                          </button>
                        )}
                        {canEdit(task) && (
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all hover:scale-105 shadow-sm"
                            title="Edit Task"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all"
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
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
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
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Completed By</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-center font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Completed</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{task.name}</div>
                      {/* Remarks visible to Rank 1 */}
                      {isRank1 && task.remarks && (
                        <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-xs flex items-start gap-1">
                          <ClipboardIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{task.remarks}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.brand ? (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {task.brand.name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{task.assignee?.name || '-'}</td>
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
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          >
                            {saving ? '...' : <CheckIcon className="w-3 h-3" />}
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
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

      {/* Completion Modal */}
      {completingTask && (
        <CompletionModal
          projectId={completingTask.id}
          projectName={completingTask.name}
          currentTypeId={completingTask.type?.id || null}
          currentTypeName={completingTask.type?.name || null}
          onClose={() => setCompletingTask(null)}
          onComplete={fetchData}
        />
      )}

      {/* Brand Management Modal - for Rank 1 users */}
      {showBrandManagement && (
        <BrandManagement
          isModal={true}
          onClose={() => setShowBrandManagement(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && currentUser && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
          currentUserId={currentUser.id}
          currentUserRank={currentUser.rank ?? 999}
          isAdmin={currentUser.is_admin}
          isRank1={isRank1}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-5 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <span className="text-xl">⚠️</span>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
