'use client';

import { useEffect, useState } from 'react';
import { getMonthlyScores } from '@/lib/mock-store';

interface ScoreEntry {
  employee_id: string;
  employee_name: string;
  total_points: number;
}

export default function Scoreboard() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setScores(getMonthlyScores());
    setLoading(false);
  }, []);

  if (loading) return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🏆 Monthly Scoreboard</h3>
      {scores.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No scores yet this month</p>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, index) => (
            <div
              key={entry.employee_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${index < 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
                  #{index + 1}
                </span>
                <span className="font-medium">{entry.employee_name}</span>
              </div>
              <span className="font-bold text-blue-600">{entry.total_points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
