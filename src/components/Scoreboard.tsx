'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import MonthSelector from './MonthSelector';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Scoreboard() {
  const now = new Date();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const supabase = createClient();

  useEffect(() => {
    fetchScores();
  }, [month, year]);

  const fetchScores = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('monthly_scores')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching scores:', error);
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

  const totalPoints = scores.reduce((sum, s) => sum + s.total_points, 0);
  const totalTasks = scores.reduce((sum, s) => sum + s.project_count, 0);

  if (loading) return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">🏆 Monthly Scoreboard</h3>
        <MonthSelector
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {MONTH_NAMES[month - 1]} {year}
      </div>

      {scores.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No scores yet for {MONTH_NAMES[month - 1]} {year}
        </p>
      ) : (
        <>
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
                <span className="font-bold text-blue-600">
                  {entry.total_points} <span className="text-sm text-gray-500">pts</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-gray-500 text-center">
            Total: {totalPoints} points across {totalTasks} tasks
          </div>
        </>
      )}
    </div>
  );
}
