'use client';

export default function LastMonthScoreboard() {
  // Placeholder cards - no names displayed, just empty cards with rank badges
  const placeholderScores = [
    {
      id: '1',
      rank: 1,
      gradient: 'from-purple-600/30 via-blue-600/30 to-purple-600/30',
      badgeColor: 'bg-yellow-500',
      badgeText: '#1'
    },
    {
      id: '2',
      rank: 2,
      gradient: 'from-blue-600/30 via-teal-600/30 to-blue-600/30',
      badgeColor: 'bg-gray-400',
      badgeText: '#2'
    },
    {
      id: '3',
      rank: 3,
      gradient: 'from-pink-600/30 via-purple-600/30 to-pink-600/30',
      badgeColor: 'bg-gray-600',
      badgeText: '#3'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 rounded-2xl p-6 border border-gray-700">
      <h3 className="text-white text-lg font-semibold mb-4">Last Month Scoreboard</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {placeholderScores.map((entry) => (
          <div
            key={entry.id}
            className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50 relative"
          >
            {/* Rank Badge */}
            <div className={`absolute -top-1 -right-1 ${entry.badgeColor} text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}>
              {entry.badgeText}
            </div>
            
            {/* Empty Profile Picture Circle */}
            <div className="flex justify-center mb-3 relative">
              <div className="w-16 h-16 rounded-full bg-gray-700/50 border-2 border-gray-600/50"></div>
            </div>
            
            {/* Empty space where name would be */}
            <div className="h-5 mb-1"></div>
            
            {/* Empty space where points would be */}
            <div className="h-6"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
