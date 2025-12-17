'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/mock-auth';
import { getProjectTypes, getRankedEmployees, addProject } from '@/lib/mock-store';

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
  currentUserRank: number;
}

export default function CreateProjectModal({ onClose, onCreated, currentUserRank }: Props) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    const allTypes = getProjectTypes();
    // Only get ranked employees (not admin)
    const rankedEmployees = getRankedEmployees();

    setTypes(allTypes);
    // Can only assign to lower rank employees (higher rank number) or self
    const assignable = rankedEmployees.filter(
      (e) => (e.rank !== null && e.rank >= currentUserRank) || e.id === user?.id
    ) as Employee[];
    setEmployees(assignable);

    if (allTypes.length) setTypeId(allTypes[0].id);
    if (user) setAssignTo(user.id);
  }, [currentUserRank]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = getCurrentUser();
    if (!user) return;

    addProject({
      name,
      type_id: typeId,
      created_by: user.id,
      assigned_to: assignTo || user.id,
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
