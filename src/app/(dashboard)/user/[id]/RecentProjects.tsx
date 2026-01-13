'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  points_override: number | null;
  type: { name: string; points: number } | null;
}

interface Props {
  employeeId: string;
  employeeName: string;
}

type ViewType = 'monthly' | 'yearly';

const statusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-900/30', text: 'text-amber-400' },
  in_progress: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  completed: { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  approved: { bg: 'bg-violet-900/30', text: 'text-violet-400' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RecentProjects({ employeeId, employeeName }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, [employeeId]);

  useEffect(() => {
    filterProjects();
  }, [projects, viewType, selectedMonth, selectedYear]);

  const fetchProjects = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        completed_at,
        created_at,
        points_override,
        type:project_types(name, points)
      `)
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
      return;
    }

    const transformed = (data || []).map((p: any) => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
    })) as Project[];

    setProjects(transformed);
    setLoading(false);
  };

  const filterProjects = () => {
    if (viewType === 'monthly') {
      const filtered = projects.filter(p => {
        const date = new Date(p.created_at);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      });
      setFilteredProjects(filtered);
    } else {
      const filtered = projects.filter(p => {
        const date = new Date(p.created_at);
        return date.getFullYear() === selectedYear;
      });
      setFilteredProjects(filtered);
    }
  };

  const handlePrevious = () => {
    if (viewType === 'monthly') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNext = () => {
    if (viewType === 'monthly') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    projects.forEach(p => {
      years.add(new Date(p.created_at).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getPoints = (project: Project) => {
    return project.points_override ?? project.type?.points ?? 0;
  };

  if (loading) {
    return (
      <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPoints = filteredProjects.reduce((sum, p) => sum + getPoints(p), 0);
  const availableYears = getAvailableYears();

  return (
    <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-700 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Projects</h3>
      
      {/* View Selector and Month/Year Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* View Type Toggle */}
        <div className="inline-flex rounded-lg border border-gray-600 bg-[#1E1E1E] p-1">
          <button
            onClick={() => setViewType('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              viewType === 'monthly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewType('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              viewType === 'yearly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
          </button>
        </div>

        {/* Month/Year Selector */}
        <div className="flex items-center gap-2 border border-gray-600 rounded-lg px-4 py-2 bg-[#1E1E1E]">
          <button
            onClick={handlePrevious}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors"
          >
            ←
          </button>

          {viewType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-base font-semibold text-white bg-transparent border-none outline-none cursor-pointer"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index} className="bg-[#2A2A2A]">
                  {month}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-base font-semibold text-white bg-transparent border-none outline-none cursor-pointer"
          >
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <option key={year} value={year} className="bg-[#2A2A2A]">
                  {year}
                </option>
              ))
            ) : (
              <option value={selectedYear} className="bg-[#2A2A2A]">{selectedYear}</option>
            )}
          </select>

          <button
            onClick={handleNext}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700 mb-4">
        <div className="text-sm text-gray-400">
          {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
        </div>
        <div className="text-lg font-bold text-blue-400">
          {totalPoints} pts
        </div>
      </div>
      
      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No projects found for this {viewType === 'monthly' ? 'month' : 'year'}.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map((project) => {
            const statusStyle = statusConfig[project.status] || statusConfig.pending;
            const points = getPoints(project);
            const hasOverride = project.points_override !== null;
            
            return (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg hover:bg-[#333333] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-white">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded">
                        {project.type?.name || 'Unknown'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                        {project.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold ${hasOverride ? 'text-orange-400' : 'text-blue-400'}`}>
                    {points}
                    <span className="text-sm text-gray-500 ml-1">pts</span>
                    {hasOverride && <span className="text-orange-400 ml-1" title="Points overridden">✎</span>}
                  </p>
                  {project.completed_at && (
                    <p className="text-xs text-gray-500 mt-1">
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
