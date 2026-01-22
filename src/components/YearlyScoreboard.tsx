'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useYearlyScores } from '@/lib/hooks/useScores';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function YearlyScoreboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Use React Query hook for data fetching with automatic caching
  const { data: scores = [], isLoading: loading } = useYearlyScores(selectedYear);

  return (
    <div className="flex flex-col">
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white text-[16px] sm:text-[18px] font-semibold">Yearly scoreboard</h3>
          <p className="text-gray-500 text-[12px] sm:text-[14px]">{MONTH_NAMES[now.getMonth()]} {selectedYear}</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-transparent text-white text-[12px] sm:text-[14px] border-none focus:outline-none cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-black">
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Table Container */}
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] p-3 sm:p-5 flex-1" style={{ backgroundColor: '#141415' }}>
        {loading ? (
          <div className="animate-pulse h-[200px] sm:h-[300px]"></div>
        ) : scores.length === 0 ? (
          <p className="text-gray-400 text-center py-6 sm:py-8 text-[13px] sm:text-[15px]">
            No scores yet
          </p>
        ) : (
          <div className="space-y-1">
            {scores.map((entry, index) => {
              const bgImage = index === 0 ? '/Rectangle%20766.png' : index === 1 ? '/Rectangle%20767.png' : index === 2 ? '/Rectangle%20768.png' : null;
              return (
                <Link
                  key={entry.id}
                  href={`/user/${entry.employee_id}`}
                  className={`flex items-center justify-between py-1.5 sm:py-2 hover:bg-white/5 rounded-lg px-2 sm:px-3 transition-colors ${index < 3 ? 'bg-cover bg-center bg-no-repeat' : ''
                    }`}
                  style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Profile Photo */}
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold overflow-hidden flex-shrink-0">
                      {entry.profile_photo ? (
                        <img src={entry.profile_photo} alt={entry.employee_name} className="w-full h-full object-cover" />
                      ) : (
                        entry.employee_name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="text-white text-[14px] sm:text-[16px] font-semibold">{entry.employee_name}</span>
                      <span className="text-gray-400 text-[11px] sm:text-[13px] ml-1">({entry.project_count} projects)</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-white text-[14px] sm:text-[16px] font-bold">{Number(entry.total_points).toFixed(1)}</span>
                    <span className="text-gray-500 text-[11px] sm:text-[13px] ml-1">pts</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
