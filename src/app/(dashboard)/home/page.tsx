import { createClient } from '@/lib/supabase/server';
import DashboardToggle from '@/components/DashboardToggle';
import LastMonthScoreboard from '@/components/LastMonthScoreboard';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .ilike('email', user?.email || '')
    .single();

  return (
    <div className="space-y-6">
      {/* Welcome Section and Scoreboard */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Welcome Section */}
        <div className="space-y-1">
          <p className="text-gray-400 text-[14px] font-medium tracking-wide">
            Ready to conquer your project
          </p>
          <h1 className="text-[32px] font-light text-white">
            Welcome Back, {employee?.name || 'User'}
          </h1>
          <div className="h-[2px] w-[200px] bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-1"></div>
        </div>

        {/* Last Month Scoreboard */}
        <LastMonthScoreboard />
      </div>
      
      {/* Toggle between Scoreboard and Projects */}
      <DashboardToggle />
    </div>
  );
}
