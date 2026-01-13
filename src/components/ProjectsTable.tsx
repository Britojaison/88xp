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

interface ProjectsTableProps {
  filterMonth?: number;
  filterYear?: number;
}

export default function ProjectsTable({ filterMonth = 0, filterYear = 0 }: ProjectsTableProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, [filterMonth, filterYear]);

  const fetchProjects = async () => {
    setLoading(true);
    
    let query = supabase
      .from('projects')
      .select('id, name, created_at, assignee:employees!assigned_to(name), brand:brands(name), type:project_types(name)')
      .order('created_at', { ascending: false });

    // Apply date filters if specified
    if (filterYear > 0) {
      const startOfYear = `${filterYear}-01-01`;
      const endOfYear = `${filterYear}-12-31`;
      
      if (filterMonth > 0) {
        // Filter by specific month and year
        const startOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(filterYear, filterMonth, 0).getDate();
        const endOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;
        
        query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth + 'T23:59:59');
      } else {
        // Filter by year only
        query = query.gte('created_at', startOfYear).lte('created_at', endOfYear + 'T23:59:59');
      }
    } else if (filterMonth > 0) {
      // Filter by month only (current year)
      const currentYear = new Date().getFullYear();
      const startOfMonth = `${currentYear}-${String(filterMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, filterMonth, 0).getDate();
      const endOfMonth = `${currentYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;
      
      query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth + 'T23:59:59');
    }

    const { data } = await query;

    const transform = (items: typeof data) => (items || []).map((p: any) => ({
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
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="rounded-[20px] border border-[#424242] bg-black h-[50px] animate-pulse"></div>
        <div className="rounded-[20px] border border-[#424242] bg-black h-[200px] animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="rounded-[20px] border border-[#424242] bg-black px-5 h-[50px] flex items-center">
        <div className="grid grid-cols-5 gap-2 w-full">
          <div className="text-white text-[13px] font-semibold">Client Name</div>
          <div className="text-white text-[13px] font-semibold">Project Title</div>
          <div className="text-white text-[13px] font-semibold">Name</div>
          <div className="text-white text-[13px] font-semibold">Assigned On</div>
          <div className="text-white text-[13px] font-semibold">Content Type</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="rounded-[20px] border border-[#424242] bg-black overflow-hidden py-2">
        {projects.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-400 text-[13px] font-semibold">No projects found</p>
          </div>
        ) : (
          <div>
            {projects.map((project, index) => (
              <div 
                key={project.id} 
                className={`px-5 py-3 ${
                  index !== projects.length - 1 ? 'border-b border-[#424242]/30' : ''
                }`}
              >
                <div className="grid grid-cols-5 gap-4 w-full">
                  <div className="text-white text-[13px] font-medium break-words">
                    {project.brand?.name || '-'}
                  </div>
                  <div className="text-white text-[13px] font-medium break-words">
                    {project.name}
                  </div>
                  <div className="text-white text-[13px] font-medium break-words">
                    {project.assignee?.name || 'Unassigned'}
                  </div>
                  <div className="text-white text-[13px] font-medium">
                    {formatDate(project.created_at)}
                  </div>
                  <div className="text-white text-[13px] font-medium break-words">
                    {project.type?.name || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
