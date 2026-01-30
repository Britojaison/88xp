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
  const [creationDate, setCreationDate] = useState('');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // Set today's date as default for both creation date and due date
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    // Set creation date and due date to today
    setCreationDate(todayISO);
    setDeadlineDate(todayISO);
  }, []);

  const fetchData = async () => {
    const [typesRes, employeesRes, brandsRes, lastProjectRes] = await Promise.all([
      supabase.from('project_types').select('*').order('points'),
      supabase.from('employees').select('id, name, rank').eq('is_admin', false).order('rank'),
      supabase.from('brands').select('id, name').order('name'),
      // Fetch the user's last created project to get their last used brand
      supabase
        .from('projects')
        .select('brand_id')
        .eq('created_by', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
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

    // Filter employees that can be assigned to using centralized logic
    const assignable = (employeesRes.data || []).filter(
      (e: any) => canAssignTo(currentUserRank, e.rank, currentUserId, e.id)
    );
    setEmployees(assignable);

    if (sortedTypes.length) setTypeId(sortedTypes[0].id);
    
    // Auto-fill brand from user's last project, or use first brand as fallback
    if (lastProjectRes.data?.brand_id) {
      setBrandId(lastProjectRes.data.brand_id);
    } else if (brandsRes.data?.length) {
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

    const projectData: any = {
      name,
      type_id: typeId,
      brand_id: brandId || null,
      created_by: currentUserId,
      assigned_to: assignTo || currentUserId,
      status: 'pending',
      deadline: deadlineValue,
      created_at: creationDate ? `${creationDate}T00:00:00.000Z` : new Date().toISOString(),
    };

    // Add points_override for "Other" type (can be decimal)
    if (isOtherType && customPoints) {
      projectData.points_override = parseFloat(customPoints);
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

  return (
    <div
      className="fixed inset-0 flex items-start justify-end z-50 pt-[20px] pr-[40px] pointer-events-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="rounded-[25px] w-[412px] flex flex-col relative pointer-events-auto overflow-visible"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(110, 110, 110, 0.2)',
          border: '1px solid rgba(110, 110, 110, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Title */}
        <div className="px-6 pt-4 pb-2">
          <h2 className="text-white text-[18px] font-bold">Create Task</h2>
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
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {Number(type.points).toFixed(1)} pts
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
                  placeholder="Enter Points"
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
                type="date"
                value={creationDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  const today = new Date();
                  const todayISO = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                  
                  if (selectedDate > todayISO) {
                    setCreationDate(todayISO);
                    setError('Creation date cannot be in the future');
                    setTimeout(() => setError(null), 2000);
                  } else {
                    setCreationDate(selectedDate);
                  }
                }}
                max={(() => {
                  const today = new Date();
                  return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                })()}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black text-[13px] cursor-pointer"
                style={{
                  border: '1px solid #D3FEE4',
                }}
              />
            </div>

            {/* Due Date - Any date allowed */}
            <div>
              <label className="block text-white text-[13px] font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => {
                  setDeadlineDate(e.target.value);
                  setDeadlineTime('23:59');
                }}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full h-[36px] rounded-[5px] px-3 py-1.5 bg-white text-black text-[13px] cursor-pointer"
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
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
