'use client';

import { useEffect, useState } from 'react';
import Scoreboard from '@/components/Scoreboard';
import ActiveProjects from '@/components/ActiveProjects';
import { getCurrentUser } from '@/lib/mock-auth';

export default function HomePage() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setUserName(user?.name || 'Employee');
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Welcome back, {userName}! 👋
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Scoreboard />
        <ActiveProjects />
      </div>
    </div>
  );
}
