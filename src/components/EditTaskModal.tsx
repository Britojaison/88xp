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

interface Brand {
  id: string;
  name: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  created_by: string;
  assigned_to: string;
  type: { id: string; name: string; points: number } | null;
  deadline: string | null;
  remarks?: string | null;
  points_override?: number | null;
  created_at?: string | null;
  brand_id?: string | null;
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
  const [brandId, setBrandId] = useState(task.brand_id || '');
  const [assignTo, setAssignTo] = useState(task.assigned_to);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [creationDate, setCreationDate] = useState('');
  const [creationDateInput, setCreationDateInput] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [remarks, setRemarks] = useState(task.remarks || '');
  const [customPoints, setCustomPoints] = useState(task.points_override?.toString() || '');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    
    // Initialize due date from task
    if (task.deadline) {
      const date = new Date(task.deadline);
      const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      const iso = date.toISOString().split('T')[0];
      setDueDateInput(formatted);
      setDeadlineDate(iso);
    } else {
      // Default to today
      const today = new Date();
      const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      setDueDateInput(todayFormatted);
      setDeadlineDate(todayISO);
    }
    
    // Initialize creation date from task
    if (task.created_at) {
      const date = new Date(task.created_at);
      const formatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      const iso = date.toISOString().split('T')[0];
      setCreationDateInput(formatted);
      setCreationDate(iso);
    } else {
      // Default to today
      const today = new Date();
      const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      setCreationDateInput(todayFormatted);
      setCreationDate(todayISO);
    }
  }, []);

  const fetchData = async () => {
    const [typesRes, employeesRes, brandsRes] = await Promise.all([
      supabase.from('project_types').select('*').order('points'),
      supabase.from('employees').select('id, name, rank, is_deleted').eq('is_admin', false).order('rank'),
      supabase.from('brands').select('id, name').order('name'),
    ]);

    // Sort types: Story first, Other last, rest in ascending order
    const sortedTypes = (typesRes.data || []).sort((a: any, b: any) => {
      if (a.name === 'Story') return -1;
      if (b.name === 'Story') return 1;
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.points - b.points;
    });

    setTypes(sortedTypes);
    setBrands(brandsRes.data || []);
    
    // Filter active employees that can be assigned to using centralized logic
    const assignable = (employeesRes.data || [])
      .filter((e: any) => !e.is_deleted && canAssignTo(currentUserRank, e.rank, currentUserId, e.id))
      .map((e: any) => ({ id: e.id, name: e.name, rank: e.rank }));

    // If the task is currently assigned to a deleted employee, add them to options so it displays correctly
    const currentAssignee = (employeesRes.data || []).find((e: any) => e.id === task.assigned_to);
    if (currentAssignee && currentAssignee.is_deleted) {
      assignable.push({
        id: currentAssignee.id,
        name: `${currentAssignee.name} (Archived)`,
        rank: currentAssignee.rank
      });
    }

    setEmployees(assignable);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCompleted = task.status === 'completed' || task.status === 'approved';
    if (isCompleted && currentUserId !== task.created_by) {
      setError('Only the task owner can edit a completed or approved task.');
      return;
    }

    setLoading(true);
    setError(null);

    // Check if "Other" type is selected
    const selectedType = types.find(t => t.id === typeId);
    const isOtherType = selectedType?.name === 'Other';

    // Validate custom points for "Other" type (allow decimals)
    if (isOtherType) {
      const points = parseFloat(customPoints);
      if (!customPoints || !Number.isFinite(points) || points <= 0) {
        setError('Please enter a valid number of points (greater than 0) for "Other" type tasks.');
        setLoading(false);
        return;
      }
    }

    // Combine date and time for deadline
    let deadlineValue = null;
    if (deadlineDate) {
      deadlineValue = `${deadlineDate}T${deadlineTime || '23:59'}:00.000Z`;
    }

    // For completed tasks, only allow deadline changes if admin
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
      brand_id: brandId || null,
      assigned_to: assignTo,
      deadline: deadlineValue,
      remarks: remarks || null,
      points_override: isOtherType && customPoints ? parseFloat(customPoints) : null,
      created_at: creationDate ? `${creationDate}T00:00:00.000Z` : undefined,
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
      className="fixed inset-0 flex items-end sm:items-start justify-center sm:justify-end z-50 p-0 sm:pt-[20px] sm:pr-[40px] bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[385px] max-h-[85vh] sm:max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[25px] flex flex-col relative pointer-events-auto shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-top duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Title & Close */}
        <div className="px-5 sm:px-6 pt-3 sm:pt-4 pb-2 flex items-center justify-between border-b border-white/10 sm:border-none">
          <h2 className="text-white text-[17px] sm:text-[18px] font-bold">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col px-5 sm:px-6 py-3 pb-8 sm:pb-4">
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

            {/* Brand Name */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Brand Name</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
              >
                <option value="">Select a brand...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
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

            {/* Points */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Points</label>
              {types.find(t => t.id === typeId)?.name === 'Other' ? (
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder="Enter Points"
                  className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px]"
                  style={{
                    border: '1px solid #D3FEE4',
                  }}
                  required
                />
              ) : (
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
              )}
            </div>

            {/* Creation Date - Past dates only */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Creation Date</label>
              <input
                type="text"
                value={creationDateInput}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const currentValue = creationDateInput;
                  
                  // If deleting (input is shorter than current)
                  if (inputValue.length < currentValue.length) {
                    setCreationDateInput(inputValue);
                    
                    const cleanValue = inputValue.replace(/\//g, '');
                    if (cleanValue.length >= 6) {
                      const day = inputValue.substring(0, 2);
                      const month = inputValue.substring(3, 5);
                      let year = inputValue.substring(6);
                      if (year.length === 2) year = '20' + year;
                      if (year.length === 4) {
                        const parsed = `${year}-${month}-${day}`;
                        const selectedDate = new Date(parsed);
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        if (selectedDate <= today && !isNaN(selectedDate.getTime())) {
                          setCreationDate(parsed);
                        }
                      }
                    }
                    return;
                  }
                  
                  let digits = inputValue.replace(/\D/g, '');
                  
                  let formatted = '';
                  if (digits.length > 0) {
                    formatted = digits.substring(0, 2);
                  }
                  if (digits.length > 2) {
                    formatted += '/' + digits.substring(2, 4);
                  }
                  if (digits.length > 4) {
                    formatted += '/' + digits.substring(4, 8);
                  }
                  
                  setCreationDateInput(formatted);
                  
                  if (digits.length >= 6) {
                    const day = digits.substring(0, 2);
                    const month = digits.substring(2, 4);
                    let year = digits.substring(4);
                    
                    if (year.length === 2) {
                      year = '20' + year;
                    }
                    
                    if (year.length === 4) {
                      const parsed = `${year}-${month}-${day}`;
                      const selectedDate = new Date(parsed);
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      
                      if (selectedDate <= today && !isNaN(selectedDate.getTime())) {
                        setCreationDate(parsed);
                      } else if (selectedDate > today) {
                        const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
                        const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                        setCreationDateInput(todayFormatted);
                        setCreationDate(todayISO);
                        setError('Creation date cannot be in the future');
                        setTimeout(() => setError(null), 2000);
                      }
                    }
                  } else if (!digits) {
                    setCreationDate('');
                  }
                }}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
              />
            </div>

            {/* Due Date - Any date allowed */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Due Date</label>
              <input
                type="text"
                value={dueDateInput}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const currentValue = dueDateInput;
                  
                  // If deleting (input is shorter than current)
                  if (inputValue.length < currentValue.length) {
                    setDueDateInput(inputValue);
                    
                    const cleanValue = inputValue.replace(/\//g, '');
                    if (cleanValue.length >= 6) {
                      const day = inputValue.substring(0, 2);
                      const month = inputValue.substring(3, 5);
                      let year = inputValue.substring(6);
                      if (year.length === 2) year = '20' + year;
                      if (year.length === 4) {
                        const parsed = `${year}-${month}-${day}`;
                        const selectedDate = new Date(parsed);
                        if (!isNaN(selectedDate.getTime())) {
                          setDeadlineDate(parsed);
                        }
                      }
                    }
                    return;
                  }
                  
                  let digits = inputValue.replace(/\D/g, '');
                  
                  let formatted = '';
                  if (digits.length > 0) {
                    formatted = digits.substring(0, 2);
                  }
                  if (digits.length > 2) {
                    formatted += '/' + digits.substring(2, 4);
                  }
                  if (digits.length > 4) {
                    formatted += '/' + digits.substring(4, 8);
                  }
                  
                  setDueDateInput(formatted);
                  
                  if (digits.length >= 6) {
                    const day = digits.substring(0, 2);
                    const month = digits.substring(2, 4);
                    let year = digits.substring(4);
                    
                    if (year.length === 2) {
                      year = '20' + year;
                    }
                    
                    if (year.length === 4) {
                      const parsed = `${year}-${month}-${day}`;
                      const selectedDate = new Date(parsed);
                      
                      if (!isNaN(selectedDate.getTime())) {
                        setDeadlineDate(parsed);
                        setDeadlineTime('23:59');
                      }
                    }
                  } else if (!digits) {
                    setDeadlineDate('');
                    setDeadlineTime('23:59');
                  }
                }}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px]"
                style={{
                  border: '1px solid #D3FEE4',
                }}
                disabled={(task.status === 'completed' || task.status === 'approved') && !isAdmin}
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
                rows={2}
                className="w-full rounded-[5px] px-3 py-1.5 bg-white text-black placeholder:text-gray-400 text-[13px] resize-none"
                style={{
                  border: '1px solid #D3FEE4',
                }}
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

