'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CreateProjectModal from '@/components/CreateProjectModal';
import CompletionModal from '@/components/CompletionModal';
import BrandManagement from '@/components/BrandManagement';
import { CheckIcon, CheckCircleIcon, PencilIcon, TrashIcon, LayoutGridIcon } from 'lucide-react';
import EditTaskModal from '@/components/EditTaskModal';
import { canEditTask } from '@/lib/rank-utils';
import ProjectsSkeleton from '@/components/skeletons/ProjectsSkeleton';

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

// Helper function to render remarks with clickable links
const renderRemarks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

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
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
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
  const completedTasks = filteredTasks.filter(isCompleted).sort((a, b) => {
    const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bDate - aDate; // Newest first
  });

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
    return <ProjectsSkeleton />;
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-white text-[12px] sm:text-[14px]">Manage all task in one place</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Tasks</h1>
            {/* Gradient underline - spans full width of Tasks text */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-2"></div>
          </div>
          {/* Create Task Button - adjusted size to fit text better */}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-[20px] sm:rounded-[25px] h-[40px] sm:h-[50px] px-4 sm:px-6 flex items-center justify-center transition-opacity hover:opacity-90 relative overflow-hidden"
            style={{
              backgroundImage: 'url(/Rectangle%2022.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <span className="text-white font-semibold text-[14px] sm:text-[16px]">+ Create Task</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left side - Employee Filter */}
        <div className="flex items-center gap-2">
          <span className="text-white text-[12px] sm:text-[14px] font-medium">Employee</span>
          <div 
            className="relative h-[40px] sm:h-[50px] w-[100px] sm:w-[122px] rounded-[12px] sm:rounded-[15px]"
            style={{
              backgroundImage: 'url(/Rectangle%2019.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="absolute inset-[1px] rounded-[12px] sm:rounded-[15px] bg-black text-white px-3 sm:px-4 text-[12px] sm:text-[14px] appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">All</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Right side - Status and Year Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-white text-[12px] sm:text-[14px] font-medium">Status</span>
            <div 
              className="relative h-[40px] sm:h-[50px] w-[240px] sm:w-[300px] lg:w-[370px] rounded-[12px] sm:rounded-[15px]"
              style={{
                backgroundImage: 'url(/Rectangle%2019.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-[1px] rounded-[12px] sm:rounded-[15px] bg-black flex items-center">
                {(['all', 'ongoing', 'completed'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`h-full flex-1 rounded-[12px] sm:rounded-[15px] text-[11px] sm:text-[13px] lg:text-[14px] font-medium transition-all relative ${
                      statusFilter === s ? 'text-white' : 'text-white hover:bg-white/5'
                    }`}
                  >
                    {statusFilter === s && (
                      <div 
                        className="absolute inset-0 rounded-[12px] sm:rounded-[15px]"
                        style={{
                          backgroundImage: 'url(/Rectangle%2023.png)',
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    )}
                    <span className="relative z-10">{s === 'all' ? 'All' : s === 'ongoing' ? 'Ongoing' : 'Completed'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-white text-[12px] sm:text-[14px] font-medium">Year</span>
            <div 
              className="relative h-[40px] sm:h-[50px] w-[100px] sm:w-[122px] rounded-[12px] sm:rounded-[15px]"
              style={{
                backgroundImage: 'url(/Rectangle%2019.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="absolute inset-[1px] rounded-[12px] sm:rounded-[15px] bg-black text-white px-3 sm:px-4 text-[12px] sm:text-[14px] appearance-none cursor-pointer focus:outline-none"
              >
                <option value="all">All</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Tasks Table - Only show when filter is 'all' or 'ongoing' */}
      {(statusFilter === 'all' || statusFilter === 'ongoing') && (
        <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden" style={{ backgroundColor: ' #141415ff' }}>
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <h2 className="text-white text-[16px] sm:text-[20px] font-bold">Ongoing Task</h2>
          </div>
          {ongoingTasks.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-400 text-sm">No ongoing tasks</div>
          ) : (
            <div className="px-4 sm:px-6 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">PROJECT TITLE</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">BRAND</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">ASSIGNED TO</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">CREATED BY</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">STATUS</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">TYPE</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">POINTS</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">ASSIGNED DATE</th>
                    <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingTasks.map((task, index) => (
                    <tr key={task.id}>
                      <td className="px-2 py-3 sm:py-4">
                        <div className="text-white text-[11px] sm:text-[13px] font-medium break-words max-w-[150px] sm:max-w-none">{task.name}</div>
                        {task.remarks && (isRank1 || currentUser?.id === task.assigned_to) && (
                          <div className="text-gray-400 text-[9px] sm:text-[11px] mt-1 break-words">{renderRemarks(task.remarks)}</div>
                        )}
                      </td>
                      <td className="px-2 py-3 sm:py-4 text-[11px] sm:text-[13px]" style={{ color: 'rgb(170, 130, 174)' }}>{task.brand?.name || '-'}</td>
                      <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.assignee?.name || '-'}</td>
                      <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.creator?.name || '-'}</td>
                      <td className="px-2 py-3 sm:py-4">
                        <span className="text-purple-400 text-[11px] sm:text-[13px] font-medium">Pending</span>
                      </td>
                      <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.type?.name || '-'}</td>
                      <td className="px-2 py-3 sm:py-4 text-blue-400 text-[11px] sm:text-[13px] font-medium">{getPoints(task)} pts</td>
                      <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{formatDateShort(task.created_at)}</td>
                      <td className="px-2 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {canEdit(task) && (
                            <button
                              onClick={() => setEditingTask(task)}
                              className="hover:opacity-80 transition-opacity"
                              title="Edit"
                            >
                              <img src="/pencil.png" alt="Edit" className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {canMarkComplete(task) && (
                            <button
                              onClick={() => setCompletingTask(task)}
                              className="hover:opacity-80 transition-opacity"
                              title="Complete"
                            >
                              <img src="/tick.png" alt="Complete" className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {canDelete(task) && (
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="hover:opacity-80 transition-opacity"
                              title="Delete"
                            >
                              <img src="/trash.png" alt="Delete" className="w-3 h-4" />
                            </button>
                          )}
                          {!canEdit(task) && !canMarkComplete(task) && !canDelete(task) && (
                            <span className="text-gray-500 text-[12px]">-</span>
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
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] bg-black overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-white text-[16px] sm:text-[20px] font-bold">Completed</h2>
        </div>
        {completedTasks.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-gray-400 text-sm">No completed tasks</div>
        ) : (
          <div className="px-4 sm:px-6 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">PROJECT TITLE</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">BRAND</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">COMPLETED BY</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">CREATED BY</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">STATUS</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">TYPE</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">POINTS</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">FINISHED ON</th>
                  <th className="px-2 py-2 sm:py-3 text-left text-[#747474] text-[10px] sm:text-[12px] font-medium whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task, index) => (
                  <tr key={task.id}>
                    <td className="px-2 py-3 sm:py-4">
                      <div className="text-white text-[11px] sm:text-[13px] font-medium break-words max-w-[150px] sm:max-w-none">{task.name}</div>
                      {task.remarks && (isRank1 || currentUser?.id === task.assigned_to) && (
                        <div className="text-gray-400 text-[9px] sm:text-[11px] mt-1 break-words">{renderRemarks(task.remarks)}</div>
                      )}
                    </td>
                    <td className="px-2 py-3 sm:py-4 text-[11px] sm:text-[13px]" style={{ color: 'rgb(170, 130, 174)' }}>{task.brand?.name || '-'}</td>
                    <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.assignee?.name || '-'}</td>
                    <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.creator?.name || '-'}</td>
                    <td className="px-2 py-3 sm:py-4">
                      <span className="text-white text-[11px] sm:text-[13px] font-medium">Completed</span>
                    </td>
                    <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">{task.type?.name || '-'}</td>
                    <td className="px-2 py-3 sm:py-4">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={overridePoints}
                            onChange={(e) => setOverridePoints(Number(e.target.value))}
                            className="w-12 sm:w-14 border border-[#424242] rounded px-1 py-1 text-center text-[10px] sm:text-[12px] bg-black text-white"
                            min={0}
                            autoFocus
                          />
                          <button
                            onClick={() => handleOverridePoints(task.id)}
                            disabled={saving}
                            className="text-white hover:opacity-80 transition-opacity"
                          >
                            {saving ? '...' : <CheckIcon className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-white hover:opacity-80 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-400 text-[11px] sm:text-[13px] font-medium">
                          +{getPoints(task)} pts
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 sm:py-4 text-white text-[11px] sm:text-[13px]">
                      {task.completed_at ? formatDateShort(task.completed_at) : '-'}
                    </td>
                    <td className="px-2 py-3 sm:py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {/* Toggle to move back to pending */}
                        {(isRank1 || currentUser?.id === task.assigned_to) && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'pending')}
                            className="relative w-9 h-5 rounded-full bg-emerald-500 transition-colors flex-shrink-0"
                            title="Move back to pending"
                          >
                            <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform" />
                          </button>
                        )}
                        {isRank1 && editingTaskId !== task.id && (
                          <button
                            onClick={() => startEditing(task)}
                            className="text-blue-400 hover:text-blue-300 text-[11px] font-medium"
                          >
                            Override
                          </button>
                        )}
                        {canDelete(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="hover:opacity-80 transition-opacity flex-shrink-0"
                            title="Delete"
                          >
                            <img src="/trash.png" alt="Delete" className="w-3 h-4" />
                          </button>
                        )}
                        {!isRank1 && !canDelete(task) && !(currentUser?.id === task.assigned_to) && (
                          <span className="text-gray-500 text-[12px]">-</span>
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
              <CheckCircleIcon className="w-4 h-4" />
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
