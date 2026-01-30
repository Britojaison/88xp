'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardToggle from '@/components/DashboardToggle';
import LastMonthScoreboard from '@/components/LastMonthScoreboard';
import CreateProjectModal from '@/components/CreateProjectModal';

export default function HomePage() {
  const [userName, setUserName] = useState('User');
  const [currentUser, setCurrentUser] = useState<{ id: string; rank: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, name, rank')
        .ilike('email', user.email)
        .single();

      if (employee) {
        setUserName(employee.name || 'User');
        setCurrentUser({ id: employee.id, rank: employee.rank ?? 999 });
      }
    }
  };

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const welcomeText = `Welcome Back, ${userName}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section and Last Month Scoreboard */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-gray-400 text-[12px] sm:text-[14px] font-medium tracking-wide">
            Ready to conquer your project
          </p>
          <div className="inline-block">
            <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-light text-white">
              {welcomeText}
            </h1>
            <div className="h-[2px] w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-1"></div>
          </div>
        </div>

        <LastMonthScoreboard />
      </div>

      {/* Create Task Button */}
      <div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-[20px] sm:rounded-[25px] h-[40px] sm:h-[50px] px-4 sm:px-6 flex items-center justify-center transition-opacity hover:opacity-90 relative overflow-hidden w-fit"
          style={{
            backgroundImage: 'url(/Rectangle%2022.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <span className="text-white font-semibold text-[14px] sm:text-[16px]">+ Create Task</span>
        </button>
      </div>
      
      {/* Toggle between Scoreboard and Projects */}
      <DashboardToggle key={refreshKey} />

      {/* Create Task Modal */}
      {showModal && currentUser && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleTaskCreated}
          currentUserId={currentUser.id}
          currentUserRank={currentUser.rank}
        />
      )}
    </div>
  );
}
