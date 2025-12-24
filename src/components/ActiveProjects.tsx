'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCwIcon, CheckCircleIcon } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  status: string;
  assignee: { name: string } | null;
  type: { name: string; points: number } | null;
  points_override: number | null;
  completed_at: string | null;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ActiveProjects() {
  const now = new Date();
  const [ongoingTasks, setOngoingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const supabase = createClient();

  const currentYear = now.getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchTasks();
  }, [selectedMonth, selectedYear]);

  const fetchTasks = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, points_override, completed_at, created_at, assignee:employees!assigned_to(name), type:project_types(name, points)')
      .order('created_at', { ascending: false });

    const transformed = (data || []).map(p => ({
      ...p,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    }));

    const filterByDate = (task: Task, useCompletedDate: boolean) => {
      const dateStr = useCompletedDate ? task.completed_at : task.created_at;
      if (!dateStr) return false;
      
      const date = new Date(dateStr);
      const taskMonth = date.getMonth() + 1;
      const taskYear = date.getFullYear();

      return taskMonth === selectedMonth && taskYear === selectedYear;
    };

    const ongoing = transformed.filter(p => 
      (p.status === 'pending' || p.status === 'in_progress') && filterByDate(p, false)
    );
    
    const completed = transformed.filter(p => 
      (p.status === 'completed' || p.status === 'approved') && filterByDate(p, true)
    );

    setOngoingTasks(ongoing);
    setCompletedTasks(completed);
    setLoading(false);
  };

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

  const getPoints = (task: Task) => {
    return task.points_override ?? task.type?.points ?? 0;
  };

  const getFilterLabel = () => {
    return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Month:</span>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <span className="ml-auto text-sm text-gray-500">
            Showing: <span className="font-medium text-gray-700">{getFilterLabel()}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
      ) : (
        <>
          {/* Ongoing Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCwIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Ongoing Tasks</h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full ml-auto">
                {ongoingTasks.length}
              </span>
            </div>
            {ongoingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No ongoing tasks for {getFilterLabel()}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <div className="col-span-4">Task Name</div>
                  <div className="col-span-3">Assigned To</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-1 text-right">Points</div>
                </div>
                {ongoingTasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg items-center hover:bg-gray-100 transition-colors">
                    <div className="col-span-4 font-medium text-gray-900 truncate">{task.name}</div>
                    <div className="col-span-3 text-gray-600">{task.assignee?.name || 'Unassigned'}</div>
                    <div className="col-span-2">{getStatusBadge(task.status)}</div>
                    <div className="col-span-2">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {task.type?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="col-span-1 text-right font-semibold text-gray-700">{getPoints(task)} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Completed Tasks</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full ml-auto">
                {completedTasks.length}
              </span>
            </div>
            {completedTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No completed tasks for {getFilterLabel()}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <div className="col-span-3">Task Name</div>
                  <div className="col-span-3">Completed By</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2 text-right">Points</div>
                </div>
                {completedTasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg items-center hover:bg-gray-100 transition-colors">
                    <div className="col-span-3 font-medium text-gray-900 truncate">{task.name}</div>
                    <div className="col-span-3 text-gray-600">{task.assignee?.name || 'Unassigned'}</div>
                    <div className="col-span-2 text-sm text-gray-500">
                      {task.completed_at
                        ? new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '-'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {task.type?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-semibold text-emerald-600">+{getPoints(task)} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
