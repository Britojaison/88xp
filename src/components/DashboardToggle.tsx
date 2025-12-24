'use client';

import { useState } from 'react';
import Scoreboard from './Scoreboard';
import YearlyScoreboard from './YearlyScoreboard';
import ActiveProjects from './ActiveProjects';
import { TrophyIcon, ClipboardIcon } from 'lucide-react';

type View = 'scoreboard' | 'tasks';

export default function DashboardToggle() {
  const [activeView, setActiveView] = useState<View>('scoreboard');

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
          <button
            onClick={() => setActiveView('scoreboard')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeView === 'scoreboard'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrophyIcon className="w-4 h-4" />
              Scoreboard
            </span>
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeView === 'tasks'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardIcon className="w-4 h-4" />
              All Tasks
            </span>
          </button>
        </div>
      </div>

      {/* Content based on toggle */}
      {activeView === 'scoreboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Scoreboard />
          <YearlyScoreboard />
        </div>
      ) : (
        <ActiveProjects />
      )}
    </div>
  );
}
