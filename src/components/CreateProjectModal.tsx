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

interface Props {
  onClose: () => void;
  onCreated: () => void;
  currentUserId: string;
  currentUserRank: number;
}

export default function CreateProjectModal({ onClose, onCreated, currentUserId, currentUserRank }: Props) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [dueDateInput, setDueDateInput] = useState('');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [typesRes, employeesRes, brandsRes] = await Promise.all([
      supabase.from('project_types').select('*').order('points'),
      supabase.from('employees').select('id, name, rank').eq('is_admin', false).order('rank'),
      supabase.from('brands').select('id, name').order('name'),
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
    setBrands(brandsRes.data || []);
    
    // Filter employees that can be assigned to using centralized logic
    const assignable = (employeesRes.data || []).filter(
      (e) => canAssignTo(currentUserRank, e.rank, currentUserId, e.id)
    );
    setEmployees(assignable);

    if (sortedTypes.length) setTypeId(sortedTypes[0].id);
    // Set default brand if available (not shown in Figma but required by backend)
    if (brandsRes.data?.length) {
      setBrandId(brandsRes.data[0].id);
    }
    setAssignTo(currentUserId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if "Other" type is selected
    const selectedType = types.find(t => t.id === typeId);
    const isOtherType = selectedType?.name === 'Other';

    // Validate custom points for "Other" type
    if (isOtherType) {
      const points = parseInt(customPoints);
      if (!customPoints || isNaN(points) || points <= 0) {
        setError('Please enter a valid number of points (greater than 0) for "Other" type tasks.');
        setLoading(false);
        return;
      }
    }

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

    const projectData: any = {
      name,
      type_id: typeId,
      brand_id: brandId || null,
      created_by: currentUserId,
      assigned_to: assignTo || currentUserId,
      status: 'pending',
      deadline: deadlineValue,
    };

    // Add points_override for "Other" type
    if (isOtherType && customPoints) {
      projectData.points_override = parseInt(customPoints);
    }

    const { error: insertError } = await supabase.from('projects').insert(projectData);

    setLoading(false);

    if (insertError) {
      setError(`Failed to create task: ${insertError.message}`);
      console.error('Task creation error:', insertError);
      return;
    }

    onCreated();
    onClose();
  };

  // Parse dd-mm-yyyy to date string
  const parseDateFromInput = (dateString: string) => {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('-');
    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="rounded-[25px] w-[412px] h-[553px] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(110, 110, 110, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(110, 110, 110, 0.1)',
          borderStyle: 'solid'
        }}
      >
        {/* Title */}
        <div className="p-6 pb-4">
          <h2 className="text-white text-xl font-bold mb-2">Create Task</h2>
          <div className="h-px bg-gradient-to-r from-purple-400 to-pink-400"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 pb-6 overflow-y-auto">
          <div className="space-y-5 flex-1">
          {/* Task Title */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Task Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Task Title"
              className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black placeholder:text-gray-400"
              style={{
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
              required
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Assignee</label>
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black"
              style={{
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
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
            <label className="block text-white text-sm font-medium mb-2">Content Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black"
              style={{
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
            >
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Points</label>
            {types.find(t => t.id === typeId)?.name === 'Other' ? (
              <input
                type="number"
                min="1"
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                placeholder="Enter Points"
                className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black placeholder:text-gray-400"
                style={{
                  border: '1px solid #D3FEE4',
                  borderStyle: 'solid'
                }}
                required
              />
            ) : (
              <input
                type="number"
                value={types.find(t => t.id === typeId)?.points || ''}
                disabled
                placeholder="Enter Points"
                className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black placeholder:text-gray-400 opacity-60"
                style={{
                  border: '1px solid #D3FEE4',
                  borderStyle: 'solid'
                }}
              />
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Due Date</label>
            <input
              type="text"
              value={dueDateInput}
              onChange={(e) => {
                const value = e.target.value;
                setDueDateInput(value);
                // Parse and set deadlineDate
                if (value.match(/^\d{2}-\d{2}-\d{4}$/)) {
                  const parsed = parseDateFromInput(value);
                  if (parsed) {
                    setDeadlineDate(parsed);
                    setDeadlineTime('23:59');
                  }
                } else if (!value) {
                  setDeadlineDate('');
                  setDeadlineTime('23:59');
                }
              }}
              placeholder="dd-mm-yyyy"
              className="w-full h-[40px] rounded-[5px] px-3 py-2 bg-white text-black placeholder:text-gray-400"
              style={{
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          </div>

          {/* Action Buttons - Always visible at bottom */}
          <div className="flex gap-3 justify-end pt-4 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-[40px] w-[101px] rounded-[5px] bg-white text-black font-medium hover:opacity-90 transition-opacity"
              style={{
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-[40px] w-[101px] rounded-[5px] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: '#307B2D',
                border: '1px solid #D3FEE4',
                borderStyle: 'solid'
              }}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
