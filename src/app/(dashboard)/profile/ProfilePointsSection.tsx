'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PointsBreakdownEntry {
  id: string;
  name: string;
  type: { name: string; points: number } | null;
  points_override: number | null;
  created_by: string;
  assigned_to: string;
  completed_at: string;
  status: string;
  creator: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
}

interface Props {
  employeeId: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProfilePointsSection({ employeeId }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<PointsBreakdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, [employeeId, month, year]);

  const fetchProjects = async () => {
    setLoading(true);
    
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, type:project_types(name, points), points_override,
        created_by, assigned_to, completed_at, status,
        creator:employees!created_by(id, name),
        assignee:employees!assigned_to(id, name)
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

    const transformed = (data || []).map(p => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    })) as PointsBreakdownEntry[];

    setProjects(transformed);
    const total = transformed.reduce((sum, p) => sum + (p.points_override ?? p.type?.points ?? 0), 0);
    setTotalPoints(total);
    setLoading(false);
  };

  const getPoints = (project: PointsBreakdownEntry) => project.points_override ?? project.type?.points ?? 0;
  const getBasePoints = (project: PointsBreakdownEntry) => project.type?.points ?? 0;
  const getOverride = (project: PointsBreakdownEntry) => project.points_override ?? 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-[18px] font-semibold">Points History</h3>
          <p className="text-[13px]">
            <span className="text-gray-400">Total : </span>
            <span className="text-purple-400 font-semibold">{totalPoints} pts</span>
            <span className="text-gray-400"> ({projects.length} projects)</span>
          </p>
        </div>
        
        {/* Month/Year Filters - with image background */}
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-[15px]"
          style={{
            backgroundImage: 'url(/Rectangle%2011.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent text-white text-[13px] focus:outline-none cursor-pointer"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1} className="bg-[#2A2A2A]">{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-white text-[13px] focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y} className="bg-[#2A2A2A]">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - Header and Content in ONE container */}
      <div className="rounded-[25px] border border-[#424242] overflow-hidden p-4">
        {/* Table Header */}
        <div className="grid grid-cols-7 px-5 py-3 text-[13px] font-medium" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.2fr' }}>
          <div className="text-white">Project</div>
          <div className="text-white">Type</div>
          <div className="text-center text-white">Base pts</div>
          <div className="text-center text-gray-400">Override</div>
          <div className="text-center text-gray-400">Final pts</div>
          <div className="text-white">Assigned By</div>
          <div className="text-white">Completed On</div>
        </div>
        
        {/* Table Data */}
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No completed tasks found for this period</div>
        ) : (
          <div>
            {projects.map((project) => (
              <div key={project.id} className="grid grid-cols-7 px-5 py-3 text-[13px] items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.2fr' }}>
                <div className="text-white font-medium pr-2 break-words">{project.name}</div>
                <div>
                  <span className="text-[13px] text-[#60A5FA]">
                    {project.type?.name || 'Unknown'}
                  </span>
                </div>
                <div className="text-center text-gray-400">{getBasePoints(project)}</div>
                <div className="text-center">
                  {getOverride(project) > 0 ? (
                    <span className="text-purple-400 font-medium">{getOverride(project)} pts</span>
                  ) : (
                    <span className="text-gray-500">0 pts</span>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-[#6885BC] font-semibold">{getPoints(project)} pts</span>
                </div>
                <div className="text-gray-400 truncate pr-2">{project.creator?.name || 'Unknown'}</div>
                <div className="text-gray-400">{formatDate(project.completed_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
