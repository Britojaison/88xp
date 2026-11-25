'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, CheckCircleIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { canApproveProject, canDeleteProject, canEditTask, canMarkComplete, canOverridePoints, canReturnProjectToApproval } from '@/lib/rank-utils';
import CreateProjectModal from '@/components/CreateProjectModal';
import CompletionModal from '@/components/CompletionModal';
import EditTaskModal from '@/components/EditTaskModal';
import ProjectsSkeleton from '@/components/skeletons/ProjectsSkeleton';

interface Task {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  points_override: number | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  assigned_to: string;
  deadline: string | null;
  remarks: string | null;
  type: { id: string; name: string; points: number } | null;
  brand: { id: string; name: string } | null;
  creator: { id: string; name: string; rank: number | null; is_deleted?: boolean } | null;
  assignee: { id: string; name: string; rank: number | null; is_deleted?: boolean } | null;
}

interface EmployeeOption { id: string; name: string; rank: number | null }
type StatusFilter = 'all' | 'wip' | 'waiting' | 'approved';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isWip = (task: Task) => task.status === 'pending' || task.status === 'in_progress';

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

function renderRemarks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => /^https?:\/\//.test(part)
    ? <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">{part}</a>
    : <span key={index}>{part}</span>);
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number | null; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'az' | 'za'>('recent');
  const [showModal, setShowModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [overridePoints, setOverridePoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yearOptions = Array.from({ length: 5 }, (_, index) => now.getFullYear() - index);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return; }

    const { data: employee } = await supabase.from('employees').select('id, rank, is_admin').ilike('email', user.email).single();
    if (!employee) { setLoading(false); return; }
    if (employee.is_admin) { router.push('/admin'); return; }
    setCurrentUser(employee);

    const [employeeResult, taskResult] = await Promise.all([
      supabase.from('employees').select('id, name, rank, is_deleted, email').eq('is_admin', false).order('rank', { ascending: true }),
      (async () => {
        let query = supabase.from('projects').select('id, name, status, deadline, remarks, points_override, created_at, completed_at, created_by, assigned_to, type:project_types(id, name, points), brand:brands(id, name), creator:employees!created_by(id, name, rank, is_deleted), assignee:employees!assigned_to(id, name, rank, is_deleted)');
        if (employeeFilter !== 'all') query = query.eq('assigned_to', employeeFilter);
        if (yearFilter !== 'all' || monthFilter !== 'all') {
          const year = yearFilter === 'all' ? currentYear : Number(yearFilter);
          let startDate: string;
          let endDate: string;
          if (monthFilter !== 'all') {
            const month = Number(monthFilter);
            startDate = new Date(year, month - 1, 1).toISOString();
            endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
          } else {
            startDate = `${year}-01-01T00:00:00.000Z`;
            endDate = `${year}-12-31T23:59:59.999Z`;
          }
          query = query.or(`and(completed_at.gte.${startDate},completed_at.lte.${endDate}),and(status.in.(pending,in_progress),created_at.lte.${endDate})`);
        }
        return query.order('created_at', { ascending: false });
      })(),
    ]);

    const activeEmployees = (employeeResult.data || []).filter((item: any) => {
      if (!item.is_deleted || !item.email?.includes('_deleted_')) return true;
      const deletedAt = Number.parseInt(item.email.split('_deleted_')[1], 10);
      if (!Number.isFinite(deletedAt)) return true;
      const date = new Date(deletedAt);
      if (yearFilter !== 'all' && Number(yearFilter) > date.getFullYear()) return false;
      if (yearFilter !== 'all' && monthFilter !== 'all' && Number(yearFilter) === date.getFullYear() && Number(monthFilter) > date.getMonth() + 1) return false;
      return true;
    }).map((item: any) => ({ id: item.id, name: `${item.name}${item.is_deleted ? ' (Archived)' : ''}`, rank: item.rank }));
    setEmployees(activeEmployees);
    if (taskResult.error) {
      console.error('Error fetching projects:', {
        code: taskResult.error.code,
        message: taskResult.error.message,
        details: taskResult.error.details,
        hint: taskResult.error.hint,
        status: taskResult.status,
      });
      setToast({ message: `Could not load projects: ${taskResult.error.message}`, type: 'error' });
      setTasks([]);
    } else {
      setTasks((taskResult.data || []).map((item: any) => ({
        ...item,
        type: Array.isArray(item.type) ? item.type[0] : item.type,
        brand: Array.isArray(item.brand) ? item.brand[0] : item.brand,
        creator: Array.isArray(item.creator) ? item.creator[0] : item.creator,
        assignee: Array.isArray(item.assignee) ? item.assignee[0] : item.assignee,
      })) as Task[]);
    }
    setLoading(false);
  }, [supabase, router, employeeFilter, monthFilter, yearFilter, currentYear]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); }, []);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  };
  const getPoints = (task: Task) => task.points_override ?? task.type?.points ?? 0;

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (statusFilter === 'wip' && !isWip(task)) return false;
    if (statusFilter === 'waiting' && task.status !== 'completed') return false;
    if (statusFilter === 'approved' && task.status !== 'approved') return false;
    if (yearFilter !== 'all' || monthFilter !== 'all') {
      const completed = !isWip(task);
      const date = new Date(completed ? (task.completed_at || task.created_at) : task.created_at);
      if (completed) {
        if (yearFilter !== 'all' && date.getFullYear() !== Number(yearFilter)) return false;
        if (monthFilter !== 'all' && date.getMonth() + 1 !== Number(monthFilter)) return false;
      } else {
        if (yearFilter !== 'all' && date.getFullYear() > Number(yearFilter)) return false;
        if (yearFilter !== 'all' && monthFilter !== 'all' && date.getFullYear() * 12 + date.getMonth() > Number(yearFilter) * 12 + Number(monthFilter) - 1) return false;
      }
    }
    return !searchQuery.trim() || task.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  }), [tasks, statusFilter, yearFilter, monthFilter, searchQuery]);

  const sortTasks = (items: Task[]) => [...items].sort((a, b) => sortOrder === 'az'
    ? a.name.localeCompare(b.name)
    : sortOrder === 'za'
      ? b.name.localeCompare(a.name)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const columns = [
    { id: 'wip', title: 'WIP', hint: 'Work in Process', tasks: sortTasks(visibleTasks.filter(isWip)), color: 'text-violet-300', badge: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
    { id: 'waiting', title: 'Waiting for Approval', hint: 'Completed work', tasks: sortTasks(visibleTasks.filter((task) => task.status === 'completed')), color: 'text-amber-300', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
    { id: 'approved', title: 'Client Approved', hint: 'Final approval', tasks: sortTasks(visibleTasks.filter((task) => task.status === 'approved')), color: 'text-emerald-300', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  ];

  const approveTask = async (task: Task) => {
    if (!currentUser || !canApproveProject(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status)) return;
    setBusyTaskId(task.id);
    const { error } = await supabase.from('projects').update({ status: 'approved' }).eq('id', task.id).eq('status', 'completed');
    setBusyTaskId(null);
    if (error) { notify(`Could not approve project: ${error.message}`, 'error'); return; }
    notify('Project moved to Client Approved');
    await fetchData();
  };

  const returnTaskToApproval = async (task: Task) => {
    if (!currentUser || !canReturnProjectToApproval(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status)) return;
    setBusyTaskId(task.id);
    const { data, error } = await supabase.from('projects')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();
    setBusyTaskId(null);
    if (error) { notify(`Could not send project back for approval: ${error.message}`, 'error'); return; }
    if (!data) { notify('Could not send project back: it may have changed or you may not have permission', 'error'); return; }
    setTasks((currentTasks) => currentTasks.map((item) => item.id === task.id ? { ...item, status: 'completed' } : item));
    notify('Project moved back to Waiting for Approval');
  };

  const deleteTask = async (task: Task) => {
    if (!currentUser || !canDeleteProject(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status)) return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', task.id);
    if (error) { notify(`Could not delete project: ${error.message}`, 'error'); return; }
    await fetchData();
  };

  const saveOverride = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !currentUser || !canOverridePoints(currentUser.rank, task.assignee?.rank ?? null, task.status)) return;
    setSaving(true);
    const { error } = await supabase.from('projects').update({ points_override: overridePoints }).eq('id', taskId);
    setSaving(false);
    if (error) { notify(`Could not update points: ${error.message}`, 'error'); return; }
    setEditingTaskId(null);
    await fetchData();
  };

  if (loading) return <ProjectsSkeleton />;

  return (
    <div className="space-y-5 text-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-gray-400">Manage all projects in one place</p><h1 className="text-3xl font-bold">Tasks</h1><div className="mt-2 h-1 w-36 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" /></div>
        <button onClick={() => setShowModal(true)} className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-semibold hover:opacity-90">+ Create Task</button>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#424242] bg-[#141415] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">Employee<select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-10 rounded-lg border border-[#424242] bg-black px-3 text-white"><option value="all">All</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm text-gray-300">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-lg border border-[#424242] bg-black px-3 text-white"><option value="all">All statuses</option><option value="wip">WIP</option><option value="waiting">Waiting for Approval</option><option value="approved">Client Approved</option></select></label>
          <label className="flex items-center gap-2 text-sm text-gray-300">Month<select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 rounded-lg border border-[#424242] bg-black px-3 text-white"><option value="all">All</option>{MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm text-gray-300">Year<select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="h-10 rounded-lg border border-[#424242] bg-black px-3 text-white"><option value="all">All</option>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search projects..." className="h-10 min-w-0 flex-1 rounded-lg border border-[#424242] bg-black px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-500" />
          <label className="flex items-center gap-2 text-sm text-gray-300">Sort by<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)} className="h-10 rounded-lg border border-[#424242] bg-black px-3 text-white"><option value="recent">Recently Added</option><option value="az">Alphabetical A–Z</option><option value="za">Alphabetical Z–A</option></select></label>
        </div>
      </section>

      <div className="flex justify-end">
        <div role="group" aria-label="Project board view" className="inline-flex rounded-xl border border-[#424242] bg-[#141415] p-1">
          {(['compact', 'detailed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${viewMode === mode ? 'bg-[#424242] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {mode === 'compact' ? 'Compact' : 'Detailed'}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {columns.map((column) => <div key={column.id} className="flex min-h-[300px] flex-col rounded-2xl border border-b-0 border-[#424242] bg-[#141415]">
          <div className="flex items-center justify-between border-b border-[#424242] px-4 py-3"><div><h2 className={`font-bold ${column.color}`}>{column.title}</h2><p className="text-xs text-gray-500">{column.hint}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${column.badge}`}>{column.tasks.length}</span></div>
          <div className="p-3">
            {column.tasks.length === 0 ? <div className="rounded-xl border border-dashed border-[#424242] px-3 py-8 text-center text-sm text-gray-500">No projects here</div> : column.tasks.map((task) => {
              const mayComplete = !!currentUser && canMarkComplete(currentUser.id, task.assigned_to, task.status);
              const mayApprove = !!currentUser && canApproveProject(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status);
              const mayReturnToApproval = !!currentUser && canReturnProjectToApproval(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status);
              const mayOverride = !!currentUser && canOverridePoints(currentUser.rank, task.assignee?.rank ?? null, task.status);
              const mayEdit = !!currentUser && canEditTask(currentUser.rank, currentUser.id, task.creator?.rank ?? null, task.created_by, task.status, currentUser.is_admin);
              const mayDelete = !!currentUser && canDeleteProject(currentUser.id, currentUser.rank, task.created_by, task.assignee?.rank ?? null, task.status);
              const date = isWip(task) ? task.deadline : task.completed_at;
              return <article key={task.id} className={`border-b border-[#424242]/40 last:border-b-0 ${viewMode === 'compact' ? 'px-3 py-2' : 'space-y-3 p-3.5'}`}>
                {viewMode === 'compact' ? <div className="flex items-center justify-between gap-2"><h3 className="break-words text-sm font-medium leading-snug text-white">{task.name}</h3>{mayReturnToApproval && <button disabled={busyTaskId === task.id} onClick={() => void returnTaskToApproval(task)} className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">{busyTaskId === task.id ? 'Sending…' : 'Send Back'}</button>}</div> : <>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="break-words font-semibold leading-snug">{task.name}</h3><div className="mt-2 flex flex-wrap gap-1.5">{task.brand?.name && <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">{task.brand.name}</span>}{task.type?.name && <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">{task.type.name}</span>}</div></div>{mayDelete && <button onClick={() => void deleteTask(task)} className="shrink-0 rounded-lg p-2 text-red-400 hover:bg-red-500/10" title="Delete project" aria-label="Delete project"><TrashIcon size={15} /></button>}</div>
                <div className="grid grid-cols-2 gap-2 text-xs"><div><p className="text-gray-500">Assignee</p><p className="mt-0.5 truncate text-gray-200">{task.assignee?.name ? `${task.assignee.name}${task.assignee.is_deleted ? ' (Archived)' : ''}` : 'Unassigned'}</p></div><div><p className="text-gray-500">{isWip(task) ? 'Deadline' : 'Finished'}</p><p className="mt-0.5 text-gray-200">{formatDate(date)}</p></div></div>
                {task.remarks && (currentUser?.rank === 1 || currentUser?.id === task.assigned_to) && <div className="break-words rounded-lg border border-white/5 bg-black/30 p-2.5 text-xs text-gray-400">{renderRemarks(task.remarks)}</div>}
                <div className="space-y-2 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">{getPoints(task).toFixed(1)} pts</span>
                    {task.points_override !== null && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-1 text-[10px] font-medium text-amber-300">Override</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {mayComplete && <button onClick={() => setCompletingTask(task)} className="rounded-lg bg-emerald-600/20 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30">Send for Approval</button>}
                  {mayApprove && <button disabled={busyTaskId === task.id} onClick={() => void approveTask(task)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{busyTaskId === task.id ? 'Approving…' : 'Move to Client Approved'}</button>}
                  {mayReturnToApproval && <button disabled={busyTaskId === task.id} onClick={() => void returnTaskToApproval(task)} className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">{busyTaskId === task.id ? 'Sending…' : 'Send Back for Approval'}</button>}
                  {mayOverride && (editingTaskId === task.id ? <div className="flex items-center gap-1"><input aria-label="Override points" type="number" min="0" step="0.01" value={overridePoints} onChange={(event) => setOverridePoints(Number(event.target.value))} className="w-20 rounded border border-[#424242] bg-black px-2 py-1.5 text-xs text-white" /><button disabled={saving} onClick={() => void saveOverride(task.id)} className="rounded p-1.5 text-emerald-300 hover:bg-white/10" aria-label="Save points override">{saving ? '…' : <CheckIcon size={15} />}</button><button onClick={() => setEditingTaskId(null)} className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-white/10">Cancel</button></div> : <button onClick={() => { setEditingTaskId(task.id); setOverridePoints(task.points_override ?? task.type?.points ?? 0); }} className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20">Override points</button>)}
                  {mayEdit && <button onClick={() => setEditingTask(task)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white" title="Edit project" aria-label="Edit project"><PencilIcon size={15} /></button>}
                  {!mayComplete && !mayApprove && !mayReturnToApproval && !mayOverride && !mayEdit && !mayDelete && <span className="text-xs text-gray-500">No actions available</span>}
                  </div>
                </div>
                </>}
              </article>;
            })}
          </div>
        </div>)}
      </section>

      {showModal && currentUser && <CreateProjectModal onClose={() => setShowModal(false)} onCreated={() => void fetchData()} currentUserId={currentUser.id} currentUserRank={currentUser.rank ?? 999} />}
      {completingTask && <CompletionModal projectId={completingTask.id} projectName={completingTask.name} currentTypeId={completingTask.type?.id || null} currentTypeName={completingTask.type?.name || null} currentPoints={getPoints(completingTask)} onClose={() => setCompletingTask(null)} onComplete={() => void fetchData()} />}
      {editingTask && currentUser && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onUpdated={() => { void fetchData(); notify('Project updated'); }} currentUserId={currentUser.id} currentUserRank={currentUser.rank ?? 999} isAdmin={currentUser.is_admin} isRank1={currentUser.rank === 1} />}
      {toast && <div role="status" className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-5 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{toast.type === 'success' && <CheckCircleIcon size={16} />}{toast.message}</div>}
    </div>
  );
}
