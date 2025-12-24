'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { canAssignTo } from '@/lib/rank-utils';

interface ProjectType {
  id: string;
  name: string;
  points: number;
}

interface Employee {
  id: string;
  name: string;
  rank: number;
}

interface Task {
  id: string;
  name: string;
  status: string;
  assigned_to: string;
  type: { id: string; name: string; points: number } | null;
  deadline: string | null;
  remarks?: string | null;
}

interface Props {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
  currentUserId: string;
  currentUserRank: number;
  isAdmin?: boolean;
  isRank1?: boolean;
}

export default function EditTaskModal({ 
  task, 
  onClose, 
  onUpdated, 
  currentUserId, 
  currentUserRank,
  isAdmin = false,
  isRank1 = false
}: Props) {
  const [name, setName] = useState(task.name);
  const [typeId, setTypeId] = useState(task.type?.id || '');
  const [assignTo, setAssignTo] = useState(task.assigned_to);
  const [deadlineDate, setDeadlineDate] = useState(() => {
    if (!task.deadline) return '';
    const date = new Date(task.deadline);
    return date.toISOString().split('T')[0];
  });
  const [deadlineTime, setDeadlineTime] = useState(() => {
    if (!task.deadline) return '23:59';
    const date = new Date(task.deadline);
    return date.toTimeString().slice(0, 5);
  });
  const [remarks, setRemarks] = useState(task.remarks || '');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [typesRes, employeesRes] = await Promise.all([
      supabase.from('project_types').select('*').order('points'),
      supabase.from('employees').select('id, name, rank').eq('is_admin', false).order('rank'),
    ]);

    // Sort types: Story first, Other last, rest in ascending order
    const sortedTypes = (typesRes.data || []).sort((a, b) => {
      if (a.name === 'Story') return -1;
      if (b.name === 'Story') return 1;
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.points - b.points;
    });

    setTypes(sortedTypes);
    
    // Filter employees that can be assigned to using centralized logic
    const assignable = (employeesRes.data || []).filter(
      (e) => canAssignTo(currentUserRank, e.rank, currentUserId, e.id)
    );
    setEmployees(assignable);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Combine date and time for deadline
    let deadlineValue = null;
    if (deadlineDate) {
      deadlineValue = `${deadlineDate}T${deadlineTime || '23:59'}:00.000Z`;
      const deadlineDateTime = new Date(deadlineValue);
      const now = new Date();
      
      if (deadlineDateTime < now) {
        setError('Deadline cannot be in the past');
        setLoading(false);
        return;
      }
    }

    // For completed tasks, only allow deadline changes if admin
    const isCompleted = task.status === 'completed' || task.status === 'approved';
    const originalDeadline = task.deadline ? new Date(task.deadline).toISOString() : null;
    if (isCompleted && !isAdmin && deadlineValue !== originalDeadline) {
      setError('Cannot change deadline on completed tasks unless you are an admin');
      setLoading(false);
      return;
    }

    // Check if reassigning to a higher-ranked employee
    const newAssignee = employees.find(e => e.id === assignTo);
    if (newAssignee && !canAssignTo(currentUserRank, newAssignee.rank, currentUserId, newAssignee.id)) {
      setError('Cannot reassign task to a higher-ranked employee');
      setLoading(false);
      return;
    }

    const updates: Record<string, unknown> = {
      name,
      type_id: typeId || null,
      assigned_to: assignTo,
      deadline: deadlineValue,
      remarks: remarks || null,
    };

    const { error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', task.id);

    setLoading(false);

    if (updateError) {
      setError(`Failed to update task: ${updateError.message}`);
      console.error('Task update error:', updateError);
      return;
    }

    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select a type...</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assign To</label>
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (Rank {emp.rank})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Deadline (optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  min={new Date().toISOString().split('T')[0]}
                  disabled={(task.status === 'completed' || task.status === 'approved') && !isAdmin}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Time</label>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={(task.status === 'completed' || task.status === 'approved') && !isAdmin}
                />
              </div>
            </div>
            {deadlineDate && (
              <button
                type="button"
                onClick={() => {
                  setDeadlineDate('');
                  setDeadlineTime('23:59');
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
                disabled={(task.status === 'completed' || task.status === 'approved') && !isAdmin}
              >
                Clear deadline
              </button>
            )}
            {(task.status === 'completed' || task.status === 'approved') && !isAdmin && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                ⚠️ Deadline cannot be changed on completed tasks unless you are an admin.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
              placeholder="Add any notes about this task... (visible to supervisors)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Remarks are visible to Rank 1 supervisors
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

