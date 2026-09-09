'use client';

import Link from 'next/link';
import { useLastMonthScores } from '@/lib/hooks/useScores';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  profile_photo?: string | null;
}

export default function LastMonthScoreboard() {
  // Use React Query hook for data fetching with automatic caching
  const { data: scores = [], isLoading: loading } = useLastMonthScores();

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const placeholderSlots = [
    { rank: 2, badgeColor: 'bg-gray-400', badgeTextColor: 'text-black' },
    { rank: 1, badgeColor: 'bg-yellow-500', badgeTextColor: 'text-black' },
    { rank: 3, badgeColor: 'bg-orange-500', badgeTextColor: 'text-white' }
  ];

  const orderedScores = scores.length >= 2
    ? [scores[1], scores[0], scores[2]].filter(Boolean)
    : scores;

  if (loading) {
    return (
      <div
        className="w-full max-w-[480px] h-[180px] sm:h-[200px] lg:h-[220px] p-4 sm:p-5 relative overflow-hidden"
        style={{ borderRadius: '30px 10px 30px 10px' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
        />
        <div className="relative z-10">
          <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4">Last Month Scoreboard</h3>
          <div className="flex justify-center gap-3 sm:gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse flex-1 max-w-[100px] text-center">
                <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full bg-gray-500/50 mb-2"></div>
                <div className="h-2.5 sm:h-3 bg-gray-500/50 rounded w-14 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[480px] min-h-[175px] sm:h-[200px] lg:h-[220px] px-3 sm:px-4 lg:px-5 py-3 sm:py-4 relative overflow-hidden"
      style={{ borderRadius: '30px 10px 30px 10px' }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
      />

      <div className="relative z-10">
        <h3 className="text-white text-sm sm:text-base lg:text-lg font-semibold mb-2 sm:mb-3">Last Month Scoreboard</h3>

        <div className="flex justify-center items-center gap-2 sm:gap-3 lg:gap-4 w-full">
          {placeholderSlots.map((slot, displayIndex) => {
            const entry = orderedScores[displayIndex];

            const CardContent = (
              <div
                className={`w-full h-[115px] sm:h-[130px] lg:h-[140px] rounded-[15px] sm:rounded-[20px] flex flex-col items-center justify-center relative px-1 py-1.5 ${
                  entry ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200' : ''
                }`}
                style={{
                  backgroundColor: 'rgba(199, 199, 199, 0.41)',
                  border: '1px solid rgba(199, 199, 199, 0.10)'
                }}
              >
                <div className="relative mb-1">
                  <div className={`absolute -top-1 -right-1.5 ${slot.badgeColor} ${slot.badgeTextColor} text-[8px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-10 shadow-sm`}>
                    #{slot.rank}
                  </div>

                  {entry ? (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm border border-white/30 overflow-hidden shadow-inner">
                      {entry.profile_photo ? (
                        <img src={entry.profile_photo} alt={entry.employee_name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(entry.employee_name)
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gray-600/50 border border-gray-500/50"></div>
                  )}
                </div>

                <p className="text-white text-[10px] sm:text-[12px] lg:text-[13px] font-medium text-center w-full px-1 truncate">
                  {entry ? (entry.is_deleted ? `${entry.employee_name} (Archived)` : entry.employee_name) : '—'}
                </p>

                <p className="text-center mt-0.5">
                  <span className="text-purple-300 font-bold text-xs sm:text-sm lg:text-base">
                    {entry ? Number(entry.total_points).toFixed(1) : '—'}
                  </span>
                  <span className="text-gray-300 text-[8px] sm:text-[10px] ml-0.5">pts</span>
                </p>
              </div>
            );

            return entry ? (
              <Link
                key={displayIndex}
                href={`/user/${entry.employee_id}`}
                prefetch={true}
                className="flex-1 min-w-0 max-w-[135px]"
              >
                {CardContent}
              </Link>
            ) : (
              <div key={displayIndex} className="flex-1 min-w-0 max-w-[135px]">
                {CardContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
