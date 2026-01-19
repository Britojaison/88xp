'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useContributions } from '@/lib/hooks/useProjects';

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

export default function ContributionGraph({ employeeId, showLegend = true, selectedYear, onYearChange }: Props) {
  const [cellSize, setCellSize] = useState<number>(12);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use React Query hook for data fetching with automatic caching
  const { data, isLoading: loading } = useContributions(employeeId, selectedYear);
  const contributions = data?.contributions || new Map();
  const totalProjects = data?.totalProjects || 0;
  const totalPoints = data?.totalPoints || 0;

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
    let ro: ResizeObserver | null = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      if (ro) {
        ro.disconnect();
        ro = null;
      }
    };
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
    <div className="bg-[#2A2A2A] rounded-xl p-3 sm:p-5 border border-gray-700 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-white">Activity Timeline</h3>
        <div className="text-xs sm:text-sm text-gray-400">
          <span className="font-semibold text-blue-400">{totalProjects}</span> projects •
          <span className="font-semibold text-blue-400 ml-1">{totalPoints}</span> pts
        </div>
      </div>

      {/* Main content with year selector inside */}
      <div className="flex gap-2 sm:gap-3">
        <div ref={containerRef} className="flex-1 overflow-x-auto">
          <div className="w-full min-w-[300px]">
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
                <span className="text-[8px] sm:text-[10px] text-gray-400 leading-none">Mon</span>
                <span></span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 leading-none">Wed</span>
                <span></span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 leading-none">Fri</span>
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
              <div className="flex items-center justify-end mt-2 sm:mt-3 gap-1 text-[8px] sm:text-[10px] text-gray-400">
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

        {/* Year Selector - Inside Activity Timeline */}
        <div className="flex flex-col gap-1 sm:gap-1.5">
          {[2024, 2025, 2026].map((year) => (
            <button
              key={year}
              onClick={() => onYearChange?.(year)}
              className={`w-[40px] sm:w-[50px] h-[24px] sm:h-[28px] rounded-[6px] sm:rounded-[8px] text-[10px] sm:text-[12px] font-medium transition-all ${selectedYear === year
                  ? 'bg-[#3A4A5A] text-white border border-cyan-400'
                  : 'bg-transparent text-gray-400 hover:text-white'
                }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
