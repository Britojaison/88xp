'use client';

import { useProjects } from '@/lib/hooks/useProjects';

interface ProjectsTableProps {
  filterMonth?: number;
  filterYear?: number;
}

export default function ProjectsTable({ filterMonth = 0, filterYear = 0 }: ProjectsTableProps) {
  // Use React Query hook for data fetching with automatic caching
  const { data: projects = [], isLoading: loading } = useProjects(filterMonth, filterYear);

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
        <div className="rounded-[20px] border border-[#424242] h-[50px] animate-pulse" style={{ backgroundColor: '#141415' }}></div>
        <div className="rounded-[20px] border border-[#424242] h-[200px] animate-pulse" style={{ backgroundColor: '#141415' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="rounded-[15px] sm:rounded-[20px] border border-[#424242] px-3 sm:px-5 h-[40px] sm:h-[50px] hidden sm:flex items-center" style={{ backgroundColor: '#141415' }}>
        <div className="grid grid-cols-5 gap-2 w-full">
          <div className="text-white text-[11px] sm:text-[13px] font-semibold">Client Name</div>
          <div className="text-white text-[11px] sm:text-[13px] font-semibold">Project Title</div>
          <div className="text-white text-[11px] sm:text-[13px] font-semibold">Name</div>
          <div className="text-white text-[11px] sm:text-[13px] font-semibold">Assigned On</div>
          <div className="text-white text-[11px] sm:text-[13px] font-semibold">Content Type</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="rounded-[15px] sm:rounded-[20px] border border-[#424242] overflow-hidden py-2" style={{ backgroundColor: '#141415' }}>
        {projects.length === 0 ? (
          <div className="px-3 sm:px-5 py-6 sm:py-8 text-center">
            <p className="text-gray-400 text-[11px] sm:text-[13px] font-semibold">No projects found</p>
          </div>
        ) : (
          <div>
            {projects.map((project, index) => (
              <div 
                key={project.id} 
                className={`px-3 sm:px-5 py-2 sm:py-3 ${
                  index !== projects.length - 1 ? 'border-b border-[#424242]/30' : ''
                }`}
              >
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-1.5 py-1">
                  <div className="text-white text-[13px] font-semibold leading-snug break-words">{project.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {project.brand?.name && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/30 font-medium">
                        {project.brand.name}
                      </span>
                    )}
                    {project.type?.name && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                        {project.type.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span className="text-gray-300 truncate max-w-[160px]">
                      {project.assignee?.name ? (project.assignee.is_deleted ? `${project.assignee.name} (Archived)` : project.assignee.name) : 'Unassigned'}
                    </span>
                    <span className="text-gray-500 text-[10px]">{formatDate(project.created_at)}</span>
                  </div>
                </div>
                
                {/* Desktop Table Row */}
                <div className="hidden sm:grid grid-cols-5 gap-4 w-full">
                  <div className="text-white text-[11px] sm:text-[13px] font-medium break-words">
                    {project.brand?.name || '-'}
                  </div>
                  <div className="text-white text-[11px] sm:text-[13px] font-medium break-words">
                    {project.name}
                  </div>
                  <div className="text-white text-[11px] sm:text-[13px] font-medium break-words">
                    {project.assignee?.name ? (project.assignee.is_deleted ? `${project.assignee.name} (Archived)` : project.assignee.name) : 'Unassigned'}
                  </div>
                  <div className="text-white text-[11px] sm:text-[13px] font-medium">
                    {formatDate(project.created_at)}
                  </div>
                  <div className="text-white text-[11px] sm:text-[13px] font-medium break-words">
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
