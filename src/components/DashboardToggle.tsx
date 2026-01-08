'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TrophyIcon, ClipboardIcon } from 'lucide-react';

// Dynamically import components to reduce initial bundle size
const Scoreboard = dynamic(() => import('./Scoreboard'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>,
  ssr: false
});

const YearlyScoreboard = dynamic(() => import('./YearlyScoreboard'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>,
  ssr: false
});

const ProjectsTable = dynamic(() => import('./ProjectsTable'), {
  loading: () => <div className="animate-pulse bg-gray-800 h-64 rounded-lg"></div>,
  ssr: false
});

type View = 'scoreboard' | 'tasks';

export default function DashboardToggle() {
  const [activeView, setActiveView] = useState<View>('tasks');

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <div className="flex justify-start">
        <div className="p-2.5 rounded-lg inline-flex gap-2.5" style={{ backgroundColor: 'rgb(44,44,44)' }}>
          <button
            onClick={() => setActiveView('scoreboard')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeView === 'scoreboard'
                ? 'bg-white text-black'
                : 'bg-transparent text-white'
            }`}
          >
            Scoreboard
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeView === 'tasks'
                ? 'bg-white text-black'
                : 'bg-transparent text-white'
            }`}
          >
            Projects
          </button>
        </div>
      </div>

      {/* Content based on toggle - dynamically loaded */}
      {activeView === 'scoreboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Scoreboard />
          <YearlyScoreboard />
        </div>
      ) : (
        <ProjectsTable />
      )}
    </div>
  );
}
