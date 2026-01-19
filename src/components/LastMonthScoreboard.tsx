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
        className="w-[480px] h-[220px] p-5 relative overflow-hidden"
        style={{ borderRadius: '30px 10px 30px 10px' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
        />
        <div className="relative z-10">
          <h3 className="text-white text-lg font-semibold mb-4">Last Month Scoreboard</h3>
          <div className="flex justify-center gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="w-[60px] h-[60px] mx-auto rounded-full bg-gray-500/50 mb-2"></div>
                <div className="h-3 bg-gray-500/50 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full sm:w-[380px] lg:w-[480px] h-[180px] sm:h-[200px] lg:h-[220px] px-3 sm:px-4 lg:px-5 py-3 sm:py-4 relative overflow-hidden"
      style={{ borderRadius: '30px 10px 30px 10px' }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
      />

      <div className="relative z-10">
        <h3 className="text-white text-base sm:text-lg font-semibold mb-2 sm:mb-4">Last Month Scoreboard</h3>

        <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4">
          {placeholderSlots.map((slot, displayIndex) => {
            const entry = orderedScores[displayIndex];

            const CardContent = (
              <div
                className={`w-[100px] sm:w-[115px] lg:w-[130px] h-[120px] sm:h-[130px] lg:h-[140px] rounded-[15px] sm:rounded-[20px] flex flex-col items-center justify-center relative ${entry ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''
                  }`}
                style={{
                  backgroundColor: 'rgba(199, 199, 199, 0.41)',
                  border: '1px solid rgba(199, 199, 199, 0.10)'
                }}
              >
                <div className="relative mb-1 sm:mb-2">
                  <div className={`absolute -top-1 -right-2 ${slot.badgeColor} ${slot.badgeTextColor} text-[8px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-10`}>
                    #{slot.rank}
                  </div>

                  {entry ? (
                    <div className="w-[45px] h-[45px] sm:w-[50px] sm:h-[50px] lg:w-[60px] lg:h-[60px] rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base border border-white/30 overflow-hidden">
                      {entry.profile_photo ? (
                        <img src={entry.profile_photo} alt={entry.employee_name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(entry.employee_name)
                      )}
                    </div>
                  ) : (
                    <div className="w-[45px] h-[45px] sm:w-[50px] sm:h-[50px] lg:w-[60px] lg:h-[60px] rounded-full bg-gray-600/50 border border-gray-500/50"></div>
                  )}
                </div>

                <p className="text-white text-[11px] sm:text-[12px] lg:text-[13px] font-medium text-center w-[90px] sm:w-[100px] lg:w-[110px] truncate">
                  {entry?.employee_name || '—'}
                </p>

                <p className="text-center mt-0.5 sm:mt-1">
                  <span className="text-purple-300 font-bold text-sm sm:text-base">
                    {entry ? entry.total_points : '—'}
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
              >
                {CardContent}
              </Link>
            ) : (
              <div key={displayIndex}>
                {CardContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
