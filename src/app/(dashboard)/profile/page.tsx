'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/mock-auth';
import { getProjects, getProjectTypes } from '@/lib/mock-store';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<{
    id: string;
    name: string;
    email: string;
    rank: number;
    created_at: string;
  } | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setEmployee(user);

    const projects = getProjects();
    const types = getProjectTypes();
    
    const approved = projects.filter(
      p => p.assigned_to === user.id && p.status === 'approved'
    );

    const points = approved.reduce((sum, p) => {
      const type = types.find(t => t.id === p.type_id);
      return sum + (p.points_override || type?.points || 0);
    }, 0);

    setTotalPoints(points);
    setCompletedCount(approved.length);
  }, []);

  if (!employee) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {employee.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{employee.name}</h2>
            <p className="text-gray-500">{employee.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Rank</p>
            <p className="text-2xl font-bold">#{employee.rank}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Points</p>
            <p className="text-2xl font-bold text-blue-600">{totalPoints}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 col-span-2">
            <p className="text-sm text-gray-500">Completed Projects</p>
            <p className="text-2xl font-bold">{completedCount}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            Member since {new Date(employee.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
