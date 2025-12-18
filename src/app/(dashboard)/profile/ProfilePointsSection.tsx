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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Points History</h2>
        
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-sm border-l ${
                viewMode === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm border-l ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
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
              className="border rounded-lg px-3 py-2 bg-white"
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

