'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CreateProjectModal from '@/components/CreateProjectModal';
import CompletionModal from '@/components/CompletionModal';
import BrandManagement from '@/components/BrandManagement';
import { CheckIcon, CheckCircleIcon, PencilIcon, TrashIcon } from 'lucide-react';
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
      .select('id, name, status, deadline, remarks, points_override, created_at, completed_at, created_by, assigned_to, type_id, brand_id, type:project_types(id, name, points), brand:brands(id, name), creator:employees!created_by(id, name, rank), assignee:employees!assigned_to(id, name, rank)')
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
    // For ongoing tasks, status should be purple text
    if (status === 'pending' || status === 'in_progress') {
      return (
        <span className="text-purple-400 text-sm font-medium capitalize">
          {status === 'pending' ? 'Pending' : 'In Progress'}
        </span>
      );
    }
    // For completed tasks, status should be white text
    return (
      <span className="text-white text-sm font-medium capitalize">
        {status === 'completed' ? 'Completed' : 'Approved'}
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

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-white text-sm">Manage all task in one place</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Tasks</h1>
            {/* Gradient underline */}
            <div className="h-1 bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400 rounded-full mt-2"></div>
          </div>
          {/* Create Task Button - Positioned as in Figma */}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-[25px] text-white font-medium h-[62px] w-[191px] flex items-center justify-center transition-opacity hover:opacity-90 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 rounded-[25px]"
              style={{
                backgroundImage: 'url(/Rectangle 19.png)',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: 0.5
              }}
            />
            <span className="relative z-10 text-white font-medium">+ Create Task</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">Employee</span>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-[15px] border border-[#424242] bg-black text-white px-4 py-2.5 text-sm h-[50px] min-w-[122px]"
          >
            <option value="all">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">Status</span>
          <div 
            className="rounded-[15px] h-[50px] relative"
            style={{ 
              width: '370px',
              backgroundImage: 'url(/Rectangle 19.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            <div 
              className="flex rounded-[15px] bg-black overflow-hidden absolute inset-[1px]"
            >
              {(['all', 'ongoing', 'completed'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2.5 text-sm capitalize transition-all ${
                    statusFilter === s 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-transparent text-white hover:bg-gray-900'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'ongoing' ? 'Ongoing' : 'Completed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">Year</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-[15px] border border-[#424242] bg-black text-white px-4 py-2.5 text-sm h-[50px] min-w-[122px]"
          >
            <option value="all">All</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ongoing Tasks Table - Only show when filter is 'all' or 'ongoing' */}
      {(statusFilter === 'all' || statusFilter === 'ongoing') && (
        <div className="rounded-[25px] border border-[#424242] bg-black overflow-hidden">
          <div className="px-5 py-4 border-b border-[#424242]">
            <h2 className="text-white text-lg font-semibold">Ongoing Task</h2>
          </div>
          {ongoingTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No ongoing tasks</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#424242]">
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">PROJECT TITLE</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">ASSIGNED TO</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">CREATED BY</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">STATUS</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">TYPE</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">POINTS</th>
                    <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">ASSIGNED DATE</th>
                    <th className="px-5 py-3 text-center text-white text-xs font-semibold uppercase">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingTasks.map((task, index) => (
                    <tr key={task.id} className={index !== ongoingTasks.length - 1 ? 'border-b border-[#424242]/30' : ''}>
                      <td className="px-5 py-3 text-white text-sm font-medium">{task.name}</td>
                      <td className="px-5 py-3 text-white text-sm">{task.assignee?.name || '-'}</td>
                      <td className="px-5 py-3 text-white text-sm">{task.creator?.name || '-'}</td>
                      <td className="px-5 py-3">{getStatusBadge(task.status)}</td>
                      <td className="px-5 py-3 text-white text-sm">{task.type?.name || '-'}</td>
                      <td className="px-5 py-3 text-blue-400 text-sm font-medium">{getPoints(task)} pts</td>
                      <td className="px-5 py-3 text-white text-sm">{formatDateShort(task.created_at)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit(task) && (
                            <button
                              onClick={() => setEditingTask(task)}
                              className="text-white hover:opacity-80 transition-opacity"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canMarkComplete(task) && (
                            <button
                              onClick={() => setCompletingTask(task)}
                              className="text-white hover:opacity-80 transition-opacity"
                              title="Complete"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete(task) && (
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="text-white hover:opacity-80 transition-opacity"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
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
      )}

      {/* Completed Tasks Table - Only show when filter is 'all' or 'completed' */}
      {(statusFilter === 'all' || statusFilter === 'completed') && (
      <div className="rounded-[25px] border border-[#424242] bg-black overflow-hidden">
        <div className="px-5 py-4 border-b border-[#424242]">
          <h2 className="text-white text-lg font-semibold">Completed</h2>
        </div>
        {completedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No completed tasks</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#424242]">
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">PROJECT TITLE</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">COMPLETED BY</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">CREATED BY</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">STATUS</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">TYPE</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">POINTS</th>
                  <th className="px-5 py-3 text-left text-white text-xs font-semibold uppercase">FINISHED ON</th>
                  <th className="px-5 py-3 text-center text-white text-xs font-semibold uppercase">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task, index) => (
                  <tr key={task.id} className={index !== completedTasks.length - 1 ? 'border-b border-[#424242]/30' : ''}>
                    <td className="px-5 py-3 text-white text-sm font-medium">{task.name}</td>
                    <td className="px-5 py-3 text-white text-sm">{task.assignee?.name || '-'}</td>
                    <td className="px-5 py-3 text-white text-sm">{task.creator?.name || '-'}</td>
                    <td className="px-5 py-3">{getStatusBadge(task.status)}</td>
                    <td className="px-5 py-3 text-white text-sm">{task.type?.name || '-'}</td>
                    <td className="px-5 py-3">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={overridePoints}
                            onChange={(e) => setOverridePoints(Number(e.target.value))}
                            className="w-16 border border-[#424242] rounded px-2 py-1 text-center text-sm bg-black text-white"
                            min={0}
                            autoFocus
                          />
                          <button
                            onClick={() => handleOverridePoints(task.id)}
                            disabled={saving}
                            className="text-white hover:opacity-80 transition-opacity"
                          >
                            {saving ? '...' : <CheckIcon className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-white hover:opacity-80 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-400 text-sm font-medium">
                          +{getPoints(task)} pts
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-white text-sm">
                      {task.completed_at ? formatDateShort(task.completed_at) : '-'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isRank1 && editingTaskId !== task.id && (
                          <button
                            onClick={() => startEditing(task)}
                            className="text-white text-sm font-medium h-[45px] w-[111px] rounded-[50px] relative overflow-hidden"
                            style={{
                              backgroundImage: 'url(/Rectangle 19.png)',
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="absolute inset-[1px] rounded-[50px] bg-black flex items-center justify-center">
                              <span className="text-white text-sm font-medium">Override</span>
                            </div>
                          </button>
                        )}
                        {canDelete(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-white hover:opacity-80 transition-opacity"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
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
      )}

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
