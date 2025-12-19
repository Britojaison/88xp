'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  status: string;
  completed_at: string | null;
  points_override: number | null;
  type: { name: string; points: number } | null;
}

interface Props {
  employeeId: string;
  employeeName: string;
}

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  approved: { bg: 'bg-violet-100', text: 'text-violet-700' },
};

export default function RecentProjects({ employeeId, employeeName }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, [employeeId]);

  const fetchProjects = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        completed_at,
        points_override,
        type:project_types(name, points)
      `)
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
      return;
    }

    // Transform the data
    const transformed = (data || []).map(p => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    })) as Project[];

    setProjects(transformed);
    setLoading(false);
  };

  const getPoints = (project: Project) => {
    return project.points_override ?? project.type?.points ?? 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
      
      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {employeeName} hasn't worked on any projects yet.
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const statusStyle = statusConfig[project.status] || statusConfig.pending;
            const points = getPoints(project);
            const hasOverride = project.points_override !== null;
            
            return (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        {project.type?.name || 'Unknown'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                        {project.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold ${hasOverride ? 'text-orange-600' : 'text-blue-600'}`}>
                    {points}
                    <span className="text-sm text-gray-400 ml-1">pts</span>
                    {hasOverride && <span className="text-orange-500 ml-1" title="Points overridden">✎</span>}
                  </p>
                  {project.completed_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(project.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

