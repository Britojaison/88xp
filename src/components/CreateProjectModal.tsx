'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

interface Props {
  onClose: () => void;
  onCreated: () => void;
  currentUserId: string;
  currentUserRank: number;
}

export default function CreateProjectModal({ onClose, onCreated, currentUserId, currentUserRank }: Props) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [typesRes, employeesRes] = await Promise.all([
      supabase.from('project_types').select('*').order('points'),
      supabase.from('employees').select('id, name, rank').eq('is_admin', false).order('rank'),
    ]);

    setTypes(typesRes.data || []);
    
    // Can only assign to same or lower rank (higher rank number) or self
    const assignable = (employeesRes.data || []).filter(
      (e) => e.rank >= currentUserRank || e.id === currentUserId
    );
    setEmployees(assignable);

    if (typesRes.data?.length) setTypeId(typesRes.data[0].id);
    setAssignTo(currentUserId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.from('projects').insert({
      name,
      type_id: typeId,
      created_by: currentUserId,
      assigned_to: assignTo || currentUserId,
      status: 'pending',
    });

    setLoading(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
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
            >
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
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (Rank {emp.rank})
                </option>
              ))}
            </select>
          </div>
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
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
