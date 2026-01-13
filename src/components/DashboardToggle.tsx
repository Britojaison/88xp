'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Scoreboard = dynamic(() => import('./Scoreboard'), {
  loading: () => <div className="animate-pulse bg-gray-800 h-48 rounded-lg"></div>,
  ssr: false
});

const YearlyScoreboard = dynamic(() => import('./YearlyScoreboard'), {
  loading: () => <div className="animate-pulse bg-gray-800 h-48 rounded-lg"></div>,
  ssr: false
});

const ProjectsTable = dynamic(() => import('./ProjectsTable'), {
  loading: () => <div className="animate-pulse bg-gray-800 h-48 rounded-[20px]"></div>,
  ssr: false
});

type View = 'scoreboard' | 'tasks';

const MONTHS = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function DashboardToggle() {
  const [activeView, setActiveView] = useState<View>('scoreboard');
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = All months
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Generate year options (current year and 4 years back)
  const years = [
    { value: 0, label: 'All Years' },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: currentYear - i,
      label: String(currentYear - i)
    }))
  ];

  return (
    <div className="space-y-4">
      {/* Toggle and Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Toggle Container */}
        <div className="w-full sm:w-[280px] h-[45px] sm:h-[50px] rounded-[15px] bg-[#2c2c2c] flex items-center justify-center gap-1 px-2">
          <button
            onClick={() => setActiveView('scoreboard')}
            className={`flex-1 sm:w-[120px] h-[32px] sm:h-[36px] rounded-[10px] transition-all duration-200 flex items-center justify-center ${
              activeView === 'scoreboard'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:text-gray-300'
            }`}
          >
            <span className="text-[12px] sm:text-[14px] font-bold">Scoreboard</span>
          </button>
          
          <button
            onClick={() => setActiveView('tasks')}
            className={`flex-1 sm:w-[120px] h-[32px] sm:h-[36px] rounded-[10px] transition-all duration-200 flex items-center justify-center ${
              activeView === 'tasks'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:text-gray-300'
            }`}
          >
            <span className="text-[12px] sm:text-[14px] font-bold">Projects</span>
          </button>
        </div>

        {/* Filter Dropdowns - Only show when Projects tab is active */}
        {activeView === 'tasks' && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-[36px] sm:h-[40px] px-2 sm:px-4 rounded-[10px] bg-[#2c2c2c] text-white text-[11px] sm:text-[13px] font-medium border border-[#424242] focus:outline-none focus:border-[#5e5e5e] cursor-pointer"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-[36px] sm:h-[40px] px-2 sm:px-4 rounded-[10px] bg-[#2c2c2c] text-white text-[11px] sm:text-[13px] font-medium border border-[#424242] focus:outline-none focus:border-[#5e5e5e] cursor-pointer"
            >
              {years.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeView === 'scoreboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Scoreboard />
          <YearlyScoreboard />
        </div>
      ) : (
        <ProjectsTable filterMonth={selectedMonth} filterYear={selectedYear} />
      )}
    </div>
  );
}
