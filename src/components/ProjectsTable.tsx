'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  created_at: string;
  assignee: { name: string } | null;
  brand: { name: string } | null;
  type: { name: string } | null;
}

export default function ProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from('projects')
      .select('id, name, created_at, assignee:employees!assigned_to(name), brand:brands(name), type:project_types(name)')
      .order('created_at', { ascending: false });

    const transform = (items: typeof data) => (items || []).map(p => ({
      ...p,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
      brand: Array.isArray(p.brand) ? p.brand[0] : p.brand,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    }));

    setProjects(transform(data) as Project[]);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
      {/* Table Header - slightly lighter gray background */}
      <div className="bg-gray-700 px-4 py-3 grid grid-cols-5 gap-4 rounded-t-lg">
        <div className="text-white text-sm font-semibold">Client Name</div>
        <div className="text-white text-sm font-semibold">Project Title</div>
        <div className="text-white text-sm font-semibold">Name</div>
        <div className="text-white text-sm font-semibold">Assigned On</div>
        <div className="text-white text-sm font-semibold">Content Type</div>
      </div>

      {/* Table Rows */}
      {projects.length === 0 ? (
        <div className="bg-black px-4 py-8 text-center">
          <p className="text-white text-sm">No projects found</p>
        </div>
      ) : (
        <div className="bg-black">
          {/* Separator line right after header */}
          <div className="h-px bg-gray-700"></div>
          {projects.map((project, index) => (
            <div key={project.id}>
              <div className="bg-black px-4 py-3 grid grid-cols-5 gap-4">
                <div className="text-white text-sm">
                  {project.brand?.name || '-'}
                </div>
                <div className="text-white text-sm">
                  {project.name}
                </div>
                <div className="text-white text-sm">
                  {project.assignee?.name || 'Unassigned'}
                </div>
                <div className="text-white text-sm">
                  {formatDate(project.created_at)}
                </div>
                <div className="text-white text-sm">
                  {project.type?.name || '-'}
                </div>
              </div>
              {/* Separator line between all rows */}
              {index < projects.length - 1 && (
                <div className="h-px bg-gray-600"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
