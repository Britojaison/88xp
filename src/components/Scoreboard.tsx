'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function Scoreboard() {
  const now = new Date();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const supabase = createClient();

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchScores();
  }, [month, year]);

  const fetchScores = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('monthly_scores')
      .select('id, employee_id, employee_name, total_points, project_count')
      .eq('month', month)
      .eq('year', year)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching scores:', error);
    }

    setScores(data || []);
    setLoading(false);
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '🏅';
  };

  return (
    <div className="flex flex-col">
      {/* Header with filters - OUTSIDE the table */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white text-[14px] font-semibold">Monthly scoreboard</h3>
          <p className="text-gray-500 text-[11px]">{MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent text-white text-[12px] border-none focus:outline-none cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value} className="bg-black">
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-white text-[12px] border-none focus:outline-none cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-black">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-[25px] border border-[#424242] bg-black p-5 flex-1">
        {loading ? (
          <div className="animate-pulse h-[300px]"></div>
        ) : scores.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-[12px]">
            No scores yet
          </p>
        ) : (
          <div className="space-y-1">
            {scores.map((entry, index) => (
              <Link
                key={entry.id}
                href={`/user/${entry.employee_id}`}
                className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">{getMedalIcon(index)}</span>
                  <div>
                    <span className="text-white text-[13px] font-semibold">{entry.employee_name}</span>
                    <span className="text-gray-400 text-[11px] ml-1">({entry.project_count} projects)</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-purple-400 text-[13px] font-bold">{entry.total_points}</span>
                  <span className="text-gray-500 text-[10px] ml-1">pts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
