'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContributionDay {
  date: string;
  count: number;
  points: number;
}

interface Props {
  employeeId: string;
  showLegend?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Blue color scale (light to dark based on activity)
const getColorClass = (count: number, maxCount: number): string => {
  if (count === 0) return 'bg-slate-100';
  const intensity = count / Math.max(maxCount, 1);
  if (intensity <= 0.25) return 'bg-blue-200';
  if (intensity <= 0.5) return 'bg-blue-400';
  if (intensity <= 0.75) return 'bg-blue-500';
  return 'bg-blue-700';
};

export default function ContributionGraph({ employeeId, showLegend = true }: Props) {
  const [contributions, setContributions] = useState<Map<string, ContributionDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchContributions();
  }, [employeeId]);

  const fetchContributions = async () => {
    setLoading(true);
    
    // Get all completed projects for this employee in the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, completed_at, points_override, type:project_types(points)')
      .eq('assigned_to', employeeId)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .gte('completed_at', oneYearAgo.toISOString())
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('Error fetching contributions:', error);
      setLoading(false);
      return;
    }

    // Group by date
    const contributionMap = new Map<string, ContributionDay>();
    let totalPts = 0;
    
    (projects || []).forEach((project) => {
      const dateKey = project.completed_at.split('T')[0];
      const typeData = Array.isArray(project.type) ? project.type[0] : project.type;
      const points = project.points_override ?? typeData?.points ?? 0;
      
      if (contributionMap.has(dateKey)) {
        const existing = contributionMap.get(dateKey)!;
        existing.count += 1;
        existing.points += points;
      } else {
        contributionMap.set(dateKey, { date: dateKey, count: 1, points });
      }
      totalPts += points;
    });

    setContributions(contributionMap);
    setTotalProjects(projects?.length || 0);
    setTotalPoints(totalPts);
    setLoading(false);
  };

  // Generate the grid (53 weeks x 7 days)
  const generateGrid = () => {
    const weeks: { date: Date; dateStr: string }[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back ~1 year
    
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    let currentWeek: { date: Date; dateStr: string }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentWeek.push({ date: new Date(currentDate), dateStr });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add any remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = generateGrid();
  const maxCount = Math.max(...Array.from(contributions.values()).map(c => c.count), 1);

  // Get month labels
  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  };

  const monthLabels = getMonthLabels();

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-blue-600">{totalProjects}</span> projects • 
          <span className="font-semibold text-blue-600 ml-1">{totalPoints}</span> points in the last year
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                className="text-xs text-gray-400"
                style={{ 
                  marginLeft: idx === 0 ? `${label.weekIndex * 14}px` : 
                    `${(label.weekIndex - monthLabels[idx - 1].weekIndex - 1) * 14}px`,
                  minWidth: '28px'
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1 text-xs text-gray-400">
              {DAYS.map((day, idx) => (
                <div key={day} className="h-3 w-6 flex items-center justify-end pr-1">
                  {idx % 2 === 1 ? day.charAt(0) : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {week.map((day) => {
                  const contribution = contributions.get(day.dateStr);
                  const count = contribution?.count || 0;
                  const points = contribution?.points || 0;
                  
                  return (
                    <div
                      key={day.dateStr}
                      className={`w-3 h-3 rounded-sm ${getColorClass(count, maxCount)} cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 hover:ring-offset-1`}
                      title={`${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}\n${count} project${count !== 1 ? 's' : ''} • ${points} points`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex items-center justify-end mt-4 gap-1 text-xs text-gray-500">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-slate-100"></div>
              <div className="w-3 h-3 rounded-sm bg-blue-200"></div>
              <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
              <div className="w-3 h-3 rounded-sm bg-blue-700"></div>
              <span>More</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

