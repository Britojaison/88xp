'use client';

import { useState } from 'react';
import PointsBreakdown from '@/components/PointsBreakdown';
import MonthSelector from '@/components/MonthSelector';

interface Props {
  employeeId: string;
}

export default function ProfilePointsSection({ employeeId }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'all'>('month');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-sm border-l border-gray-700 ${
                viewMode === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm border-l border-gray-700 ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#2A2A2A] text-white hover:bg-[#333333]'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month/Year selector */}
          {viewMode === 'month' && (
            <MonthSelector
              month={month}
              year={year}
              onMonthChange={setMonth}
              onYearChange={setYear}
            />
          )}

          {viewMode === 'year' && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-700 rounded-lg px-3 py-2 bg-[#2A2A2A] text-white"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <PointsBreakdown
        employeeId={employeeId}
        month={viewMode === 'month' ? month : undefined}
        year={viewMode === 'all' ? undefined : year}
      />
    </div>
  );
}

