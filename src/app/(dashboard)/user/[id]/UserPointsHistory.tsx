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
  brand: { id: string; name: string } | null;
}

interface Props {
  employeeId: string;
}

type ViewType = 'annually' | 'monthly';

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export default function UserPointsHistory({ employeeId }: Props) {
  const now = new Date();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>('annually');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const supabase = createClient();

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    fetchProjects();
  }, [employeeId, selectedYear, selectedMonth, viewType]);

  const fetchProjects = async () => {
    setLoading(true);
    
    let startDate: string;
    let endDate: string;

    if (viewType === 'monthly') {
      startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
    } else {
      startDate = new Date(selectedYear, 0, 1).toISOString();
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, status, completed_at, points_override,
        type:project_types(name, points),
        brand:brands(id, name)
      `)
      .eq('assigned_to', employeeId)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
      return;
    }

    const transformed = (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      brand: Array.isArray(p.brand) ? p.brand[0] : p.brand,
    })) as Project[];

    setProjects(transformed);
    setLoading(false);
  };

  const getPoints = (project: Project) => project.points_override ?? project.type?.points ?? 0;
  const totalPoints = projects.reduce((sum, p) => sum + getPoints(p), 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <h3 className="text-white text-[16px] sm:text-[18px] font-semibold">Points History</h3>
          
          {/* View Type Toggle - Using Rectangle 762.png for active state */}
          <div className="inline-flex rounded-[20px] bg-[#3C3C3C] p-1">
            <button
              onClick={() => setViewType('annually')}
              className={`px-3 sm:px-5 py-1 sm:py-1.5 rounded-[15px] text-[10px] sm:text-[12px] font-medium transition-all ${
                viewType === 'annually'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={viewType === 'annually' ? {
                backgroundImage: 'url(/Rectangle%20762.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              Annually
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 sm:px-5 py-1 sm:py-1.5 rounded-[15px] text-[10px] sm:text-[12px] font-medium transition-all ${
                viewType === 'monthly'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={viewType === 'monthly' ? {
                backgroundImage: 'url(/Rectangle%20762.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              Monthly
            </button>
          </div>

          {/* Stats - stacked vertically */}
          <div className="flex flex-col text-[10px] sm:text-[12px]">
            <div>
              <span className="text-gray-400">Total projects </span>
              <span className="text-white font-semibold">: {projects.length} Projects</span>
            </div>
            <div>
              <span className="text-gray-400">Total points </span>
              <span className="text-cyan-400 font-semibold">: {totalPoints.toFixed(1)} pts</span>
            </div>
          </div>
        </div>

        {/* Month/Year Selector - with Rectangle 11 background */}
        <div 
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-[15px]"
          style={{
            backgroundImage: 'url(/Rectangle%2011.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {viewType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-white text-[11px] sm:text-[13px] focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="bg-[#2A2A2A]">{m.label}</option>
              ))}
            </select>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-white text-[11px] sm:text-[13px] focus:outline-none cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#2A2A2A]">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden p-2 sm:p-4">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden sm:grid px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-[13px] font-medium border-b border-[#424242]" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr' }}>
          <div className="text-white pr-4">Project</div>
          <div className="text-white">Brand</div>
          <div className="text-white">Type</div>
          <div className="text-white">Points</div>
          <div className="text-white">Completed On</div>
        </div>
        
        {/* Table Data */}
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-gray-400">No completed projects found</div>
        ) : (
          <div>
            {projects.map((project) => (
              <div key={project.id}>
                {/* Mobile Card View */}
                <div className="sm:hidden p-3 border-b border-[#424242]/30 last:border-b-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white text-[12px] font-medium flex-1 pr-2">{project.name}</div>
                    <span className="text-cyan-400 text-[12px] font-semibold">{getPoints(project).toFixed(1)} pts</span>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {project.brand && <span className="text-purple-400">{project.brand.name}</span>}
                    <span className="text-gray-400">{project.type?.name || 'Unknown'}</span>
                    <span className="text-gray-400">• {formatDate(project.completed_at!)}</span>
                  </div>
                </div>
                
                {/* Desktop Table Row */}
                <div className="hidden sm:grid px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-[13px] items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr' }}>
                  <div className="text-white pr-4">{project.name}</div>
                  <div>
                    <span className="text-[11px] sm:text-[13px]" style={{ color: 'rgb(170, 130, 174)' }}>
                      {project.brand?.name || '-'}
                    </span>
                  </div>
                  <div className="text-gray-400">{project.type?.name || 'Unknown'}</div>
                  <div className="text-cyan-400 font-semibold">{getPoints(project).toFixed(1)} pts</div>
                  <div className="text-gray-400">{formatDate(project.completed_at!)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
