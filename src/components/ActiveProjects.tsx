'use client';

import { useEffect, useState } from 'react';
import { getProjects } from '@/lib/mock-store';

interface ActiveProject {
  id: string;
  name: string;
  assignee: { name: string } | null;
  type: { name: string } | null;
}

export default function ActiveProjects() {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allProjects = getProjects();
    const active = allProjects
      .filter(p => p.status === 'pending' || p.status === 'in_progress')
      .slice(0, 10);
    setProjects(active);
    setLoading(false);
  }, []);

  if (loading) return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📋 Active Projects</h3>
      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No active projects</p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">
                    {project.assignee?.name || 'Unassigned'}
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {project.type?.name || 'Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
