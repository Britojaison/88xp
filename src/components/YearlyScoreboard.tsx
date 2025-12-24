'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TrophyIcon } from 'lucide-react';

interface YearlyScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
  year: number;
}

interface Props {
  year?: number;
}

export default function YearlyScoreboard({ year }: Props) {
  const [scores, setScores] = useState<YearlyScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());
  const supabase = createClient();

  // Generate available years (current year and 4 previous years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchScores();
  }, [selectedYear]);

  const fetchScores = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('yearly_scores')
      .select('*')
      .eq('year', selectedYear)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching yearly scores:', error);
      setLoading(false);
      return;
    }

    setScores(data || []);
    setLoading(false);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrophyIcon className="w-5 h-5" />
          Yearly Scoreboard
        </h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border rounded-lg px-3 py-1 text-sm bg-white"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {scores.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No scores yet for {selectedYear}</p>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, index) => (
            <Link
              key={entry.id}
              href={`/user/${entry.employee_id}`}
              className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-lg font-bold min-w-[2rem] ${
                    index < 3 ? 'text-yellow-600' : 'text-gray-400'
                  }`}
                >
                  {getRankBadge(index)}
                </span>
                <div>
                  <span className="font-medium hover:text-blue-600 transition-colors">{entry.employee_name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({entry.project_count} tasks)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-blue-600 text-lg">
                  {entry.total_points}
                </span>
                <span className="text-sm text-gray-500 ml-1">pts</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

