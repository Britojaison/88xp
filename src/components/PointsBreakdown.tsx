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
  month?: number;
  year?: number;
}

export default function PointsBreakdown({ employeeId, month, year }: Props) {
  const [projects, setProjects] = useState<PointsBreakdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, [employeeId, month, year]);

  const fetchProjects = async () => {
    setLoading(true);
    
    // Fetch completed projects (points are awarded on completion, not approval)
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        type:project_types(name, points),
        points_override,
        created_by,
        assigned_to,
        completed_at,
        status,
        creator:employees!created_by(id, name),
        assignee:employees!assigned_to(id, name)
      `)
      .eq('assigned_to', employeeId)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      query = query.gte('completed_at', startDate).lte('completed_at', endDate);
    } else if (year) {
      const startDate = new Date(year, 0, 1).toISOString();
      const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
      query = query.gte('completed_at', startDate).lte('completed_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
      return;
    }

    // Transform the data to handle Supabase's array response for joins
    const transformed = (data || []).map(p => ({
      ...p,
      type: Array.isArray(p.type) ? p.type[0] : p.type,
      creator: Array.isArray(p.creator) ? p.creator[0] : p.creator,
      assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
    })) as PointsBreakdownEntry[];

    setProjects(transformed);

    // Calculate total points
    const total = transformed.reduce((sum, p) => {
      const points = p.points_override ?? p.type?.points ?? 0;
      return sum + points;
    }, 0);
    setTotalPoints(total);

    setLoading(false);
  };

  const getPoints = (project: PointsBreakdownEntry) => {
    return project.points_override ?? project.type?.points ?? 0;
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Points Breakdown</h3>
        <div className="text-right">
          <span className="text-sm text-gray-500">Total: </span>
          <span className="text-xl font-bold text-blue-600">{totalPoints} pts</span>
          <span className="text-sm text-gray-500 ml-2">({projects.length} projects)</span>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No completed projects found for this period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-center font-medium">Base Pts</th>
                <th className="px-4 py-3 text-center font-medium">Override</th>
                <th className="px-4 py-3 text-center font-medium">Final Pts</th>
                <th className="px-4 py-3 text-left font-medium">Assigned By</th>
                <th className="px-4 py-3 text-left font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{project.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded capitalize">
                      {project.type?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {project.type?.points ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {project.points_override ? (
                      <span className="text-orange-600 font-medium">
                        {project.points_override}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-600">
                      {getPoints(project)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.creator?.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {project.completed_at
                      ? new Date(project.completed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">Total:</td>
                <td className="px-4 py-3 text-center text-green-600">{totalPoints}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

