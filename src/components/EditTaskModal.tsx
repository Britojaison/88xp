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
    <div 
      className="fixed inset-0 flex items-start justify-end z-50 pt-[120px] pr-[40px] pointer-events-none"
      onClick={onClose}
    >
      <div 
        className="rounded-[25px] w-[365px] flex flex-col relative pointer-events-auto overflow-visible"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(40, 40, 40, 0.95)',
          border: '1px solid rgba(110, 110, 110, 0.3)',
        }}
      >
        {/* Title */}
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-white text-[18px] font-bold">Edit Task</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col px-6 pb-4">
          <div className="space-y-2.5">
            {/* Task Title */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Task Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Task Title"
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
                required
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Assignee</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Content Type</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
                required
              >
                <option value="">Select a type...</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Points (read-only) */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Points</label>
              <input
                type="number"
                value={types.find(t => t.id === typeId)?.points || ''}
                disabled
                placeholder="Points"
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-gray-200 text-gray-600 placeholder:text-gray-400 text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
                min={new Date().toISOString().split('T')[0]}
                disabled={(task.status === 'completed' || task.status === 'approved') && !isAdmin}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-2.5 py-1.5 rounded-lg text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-[36px] px-4 rounded-[5px] bg-white text-black font-medium text-[13px] hover:opacity-90 transition-opacity"
              style={{
                border: '1px solid #D3FEE4',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-[36px] px-4 rounded-[5px] text-white font-medium text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: '#307B2D',
                border: '1px solid #D3FEE4',
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

