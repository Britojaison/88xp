'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActiveProject {
  id: string;
  name: string;
  assignee: { name: string } | null;
  type: { name: string } | null;
}

export default function ActiveProjects() {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, assignee:employees!assigned_to(name), type:project_types(name)')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Transform the data to handle Supabase's array response for joins
    const transformed = (data || []).map(p => ({
      ...p,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    }));

    setProjects(transformed);
    setLoading(false);
  };

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
