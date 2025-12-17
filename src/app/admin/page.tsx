'use client';

import { useEffect, useState } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/lib/mock-store';

interface Employee {
  id: string;
  email: string;
  name: string;
  rank: number;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    const data = getEmployees();
    setEmployees(data.sort((a, b) => a.rank - b.rank));
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    deleteEmployee(id);
    fetchEmployees();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin - Manage Employees</h1>
        <button
          onClick={() => { setEditingEmployee(null); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Employee
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4">{emp.name}</td>
                <td className="px-6 py-4 text-gray-500">{emp.email}</td>
                <td className="px-6 py-4">#{emp.rank}</td>
                <td className="px-6 py-4">
                  {emp.is_admin ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Yes</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">No</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setEditingEmployee(emp); setShowModal(true); }}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSaved={fetchEmployees}
        />
      )}
    </div>
  );
}

function EmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(employee?.name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [rank, setRank] = useState(employee?.rank || 1);
  const [isAdmin, setIsAdmin] = useState(employee?.is_admin || false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (employee) {
      updateEmployee(employee.id, { name, rank, is_admin: isAdmin });
    } else {
      addEmployee({ email, name, rank, is_admin: isAdmin });
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {employee ? 'Edit Employee' : 'Add Employee'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          {!employee && (
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Rank</label>
            <input
              type="number"
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
              min={1}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isAdmin" className="text-sm">Is Admin</label>
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
