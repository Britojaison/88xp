'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
}

export default function LastMonthScoreboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchLastMonthScores();
  }, []);

  const fetchLastMonthScores = async () => {
    setLoading(true);
    
    const now = new Date();
    let lastMonth = now.getMonth();
    let year = now.getFullYear();
    
    if (lastMonth === 0) {
      lastMonth = 12;
      year = year - 1;
    }

    const { data, error } = await supabase
      .from('monthly_scores')
      .select('id, employee_id, employee_name, total_points')
      .eq('month', lastMonth)
      .eq('year', year)
      .order('total_points', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching last month scores:', error);
    }

    setScores(data || []);
    setLoading(false);
  };

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
    { rank: 3, badgeColor: 'bg-amber-700', badgeTextColor: 'text-white' }
  ];

  const orderedScores = scores.length >= 2 
    ? [scores[1], scores[0], scores[2]].filter(Boolean)
    : scores;

  if (loading) {
    return (
      <div 
        className="w-[380px] h-[160px] p-4 relative overflow-hidden"
        style={{ borderRadius: '30px 10px 30px 10px' }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
        />
        <div className="relative z-10">
          <h3 className="text-white text-sm font-semibold mb-3">Last Month Scoreboard</h3>
          <div className="flex justify-center gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="w-[40px] h-[40px] mx-auto rounded-full bg-gray-500/50 mb-1"></div>
                <div className="h-2 bg-gray-500/50 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-[380px] h-[160px] px-4 py-3 relative overflow-hidden"
      style={{ borderRadius: '30px 10px 30px 10px' }}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/Rectangle%20391.png)' }}
      />
      
      <div className="relative z-10">
        <h3 className="text-white text-sm font-semibold mb-3">Last Month Scoreboard</h3>
        
        <div className="flex justify-center gap-3">
          {placeholderSlots.map((slot, displayIndex) => {
            const entry = orderedScores[displayIndex];
            
            return (
              <div 
                key={displayIndex} 
                className="w-[100px] h-[100px] rounded-[20px] flex flex-col items-center justify-center relative"
                style={{
                  backgroundColor: 'rgba(199, 199, 199, 0.41)',
                  border: '1px solid rgba(199, 199, 199, 0.10)'
                }}
              >
                <div className="relative mb-1">
                  <div className={`absolute -top-1 -right-1 ${slot.badgeColor} ${slot.badgeTextColor} text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center z-10`}>
                    #{slot.rank}
                  </div>
                  
                  {entry ? (
                    <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-xs border border-white/30">
                      {getInitials(entry.employee_name)}
                    </div>
                  ) : (
                    <div className="w-[40px] h-[40px] rounded-full bg-gray-600/50 border border-gray-500/50"></div>
                  )}
                </div>
                
                <p className="text-white text-[10px] font-medium text-center w-[80px] truncate">
                  {entry?.employee_name || '—'}
                </p>
                
                <p className="text-center">
                  <span className="text-purple-300 font-bold text-xs">
                    {entry ? entry.total_points : '—'}
                  </span>
                  <span className="text-gray-300 text-[8px] ml-0.5">pts</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
