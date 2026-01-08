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
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Visual sizing
const MAX_CELL = 16;
const MIN_CELL = 10;
const GAP = 3;
const WEEKS = 53;
const DAY_LABEL_WIDTH = 36;

/**
 * Blue color scale using FIXED buckets (fair across all users)
 */
const getFillColor = (count: number): string => {
  if (count <= 0) return '#e2e8f0';
  if (count === 1) return '#bfdbfe';
  if (count <= 3) return '#60a5fa';
  if (count <= 6) return '#3b82f6';
  return '#1d4ed8';
};

export default function ContributionGraph({ employeeId, showLegend = true, selectedYear }: Props) {
  const [contributions, setContributions] = useState<Map<string, { count: number; points: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [cellSize, setCellSize] = useState<number>(12);
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchContributions();
  }, [employeeId, selectedYear]);

  const fetchContributions = async () => {
    setLoading(true);
    
    const now = new Date();
    const currentYear = selectedYear || now.getFullYear();
    const isCurrentYear = currentYear === now.getFullYear();
    
    let startDate: Date;
    let endDate: Date;
    
    if (isCurrentYear) {
      // For current year, show last 365 days
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 365);
    } else {
      // For past years, show the full year
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, completed_at, points_override, type:project_types(points)')
      .eq('assigned_to', employeeId)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
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

  const { weeks, monthLabels } = useMemo(() => {
    const currentYear = selectedYear || new Date().getFullYear();
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const isCurrentYear = currentYear === today.getFullYear();
    
    let endDate: Date;
    let startDate: Date;
    
    if (isCurrentYear) {
      // For current year, show last 365 days (53 weeks)
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
      
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (WEEKS * 7) + 1); // Go back 53 weeks
    } else {
      // For past years, show the full year
      endDate = new Date(currentYear, 11, 31);
      const lastSaturday = new Date(endDate);
      lastSaturday.setDate(lastSaturday.getDate() + (6 - lastSaturday.getDay()));
      
      startDate = new Date(lastSaturday);
      startDate.setDate(startDate.getDate() - (WEEKS * 7) + 1);
      endDate = lastSaturday;
    }
    
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
          count: isFuture ? -1 : 0,
          points: 0,
        });
        
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
  }, [selectedYear]);

  const todayStr = new Date().toISOString().split('T')[0];
  const gridWidth = WEEKS * cellSize + (WEEKS - 1) * GAP;
  const gridHeight = 7 * cellSize + 6 * GAP;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (!width) return;
      const available = Math.max(0, width - DAY_LABEL_WIDTH - 16);
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
      <div className="bg-[#2A2A2A] rounded-xl p-8 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2A2A2A] rounded-xl p-8 border border-gray-700 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-white">Activity Timeline</h3>
        <div className="text-sm text-gray-400">
          <span className="font-semibold text-blue-400">{totalProjects}</span> projects • 
          <span className="font-semibold text-blue-400 ml-1">{totalPoints}</span> pts
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-hidden">
        <div className="w-full">
          <div className="flex mb-1" style={{ marginLeft: DAY_LABEL_WIDTH }}>
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

          <div className="flex">
            <div className="flex flex-col justify-between pr-1" style={{ height: gridHeight, width: DAY_LABEL_WIDTH }}>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Mon</span>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Wed</span>
              <span></span>
              <span className="text-[10px] text-gray-400 leading-none">Fri</span>
              <span></span>
            </div>

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
                        stroke={isToday ? '#94a3b8' : 'none'}
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
