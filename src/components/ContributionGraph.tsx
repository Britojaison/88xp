'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContributionDay {
  date: Date;
  dateStr: string;
  count: number;
  points: number;
}

interface Props {
  employeeId: string;
  showLegend?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Visual sizing
const MAX_CELL = 16;
const MIN_CELL = 10;
const GAP = 3;
const WEEKS = 53;
const DAY_LABEL_WIDTH = 36; // matches the left gutter used in layout below

/**
 * Blue color scale using FIXED buckets (fair across all users)
 */
const getFillColor = (count: number): string => {
  // NOTE: SVG uses `fill`, not CSS `background-color` (Tailwind `bg-*` won't apply to <rect>).
  if (count <= 0) return '#e2e8f0'; // slate-200-ish, light neutral
  if (count === 1) return '#bfdbfe'; // blue-200
  if (count <= 3) return '#60a5fa'; // blue-400
  if (count <= 6) return '#3b82f6'; // blue-500
  return '#1d4ed8'; // blue-700
};

export default function ContributionGraph({ employeeId, showLegend = true }: Props) {
  const [contributions, setContributions] = useState<Map<string, { count: number; points: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [cellSize, setCellSize] = useState<number>(12);
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchContributions();
  }, [employeeId]);

  const fetchContributions = async () => {
    setLoading(true);
    
    const now = new Date();
    const oneYearAgo = new Date(now);
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

    const contributionMap = new Map<string, { count: number; points: number }>();
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
        contributionMap.set(dateKey, { count: 1, points });
      }
      totalPts += points;
    });

    setContributions(contributionMap);
    setTotalProjects(projects?.length || 0);
    setTotalPoints(totalPts);
    setLoading(false);
  };

  // Generate grid: 53 weeks, rightmost week contains today
  // Each week is a column, each day is a row (Sun=0, Sat=6)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    // Find the Saturday of the current week (end of week)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    // Go back 52 weeks to find start (Sunday)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (WEEKS * 7) + 1);
    
    const weeksArr: ContributionDay[][] = [];
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonthYear = '';
    
    const currentDate = new Date(startDate);
    
    for (let w = 0; w < WEEKS; w++) {
      const week: ContributionDay[] = [];
      
      for (let d = 0; d < 7; d++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isFuture = currentDate > today;
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          count: isFuture ? -1 : 0, // -1 marks future days
          points: 0,
        });
        
        // Check for month boundary (first day we see of a new month+year)
        const monthYear = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        if (monthYear !== lastMonthYear && !isFuture) {
          labels.push({ month: MONTHS[currentDate.getMonth()], weekIndex: w });
          lastMonthYear = monthYear;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeksArr.push(week);
    }
    
    return { weeks: weeksArr, monthLabels: labels };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Grid dimensions
  const gridWidth = WEEKS * cellSize + (WEEKS - 1) * GAP;
  const gridHeight = 7 * cellSize + 6 * GAP;

  // Fit-to-card sizing (use more space; never clip; no horizontal scrolling)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (!width) return;
      const available = Math.max(0, width - DAY_LABEL_WIDTH - 16); // padding cushion
      const computed = Math.floor((available - (WEEKS - 1) * GAP) / WEEKS);
      const next = Math.max(MIN_CELL, Math.min(MAX_CELL, computed));
      setCellSize(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Activity Timeline</h3>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-blue-600">{totalProjects}</span> projects • 
          <span className="font-semibold text-blue-600 ml-1">{totalPoints}</span> pts
        </div>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="overflow-x-hidden">
        <div className="w-full">
          {/* Month labels */}
          <div className="flex mb-1" style={{ marginLeft: DAY_LABEL_WIDTH }}>
            {/* Add 1px padding via viewBox so right edge can never be clipped */}
            <svg width={gridWidth + 2} height={16} viewBox={`-1 0 ${gridWidth + 2} 16`} overflow="visible">
              {monthLabels.map((label, idx) => (
                <text
                  key={`${label.month}-${label.weekIndex}-${idx}`}
                  x={label.weekIndex * (cellSize + GAP)}
                  y={12}
                  className="fill-gray-400"
                  style={{ fontSize: 10 }}
                >
                  {label.month}
                </text>
              ))}
            </svg>
          </div>

          {/* Day labels + Grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col justify-between pr-1" style={{ height: gridHeight, width: DAY_LABEL_WIDTH }}>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Mon</span>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Wed</span>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Fri</span>
              <span></span>
            </div>

            {/* Grid */}
            {/* Add 1px padding via viewBox so last column isn't clipped */}
            <svg
              width={gridWidth + 2}
              height={gridHeight + 2}
              viewBox={`-1 -1 ${gridWidth + 2} ${gridHeight + 2}`}
              overflow="visible"
            >
              {weeks.map((week, weekIdx) =>
                week.map((day, dayIdx) => {
                  const contribution = contributions.get(day.dateStr);
                  const count = contribution?.count || 0;
                  const points = contribution?.points || 0;
                  const isFuture = day.count === -1;
                  const isToday = day.dateStr === todayStr;

                  if (isFuture) return null;

                  const x = weekIdx * (cellSize + GAP);
                  const y = dayIdx * (cellSize + GAP);

                  return (
                    <g key={day.dateStr}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        rx={2}
                        fill={getFillColor(count)}
                        stroke={isToday ? '#94a3b8' : 'none'} /* slate-400 */
                        strokeWidth={isToday ? 1 : 0}
                      >
                        <title>{`${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}\n${count} project${count !== 1 ? 's' : ''} • ${points} points`}</title>
                      </rect>
                    </g>
                  );
                })
              )}
            </svg>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex items-center justify-end mt-3 gap-1 text-[10px] text-gray-400">
              <span>Less</span>
              <div className="rounded-sm bg-slate-200" style={{ width: cellSize, height: cellSize }} />
              <div className="rounded-sm bg-blue-200" style={{ width: cellSize, height: cellSize }} />
              <div className="rounded-sm bg-blue-400" style={{ width: cellSize, height: cellSize }} />
              <div className="rounded-sm bg-blue-500" style={{ width: cellSize, height: cellSize }} />
              <div className="rounded-sm bg-blue-700" style={{ width: cellSize, height: cellSize }} />
              <span>More</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
