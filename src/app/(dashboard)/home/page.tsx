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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <p className="text-white text-sm">Ready to conquer your project</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Welcome Back, {employee?.name || 'User'}
          </h1>
          {/* Gradient underline */}
          <div className="h-1 bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400 rounded-full mt-2"></div>
        </div>

        {/* Last Month Scoreboard */}
        <LastMonthScoreboard />
      </div>
      
      {/* Toggle between Scoreboard and Projects */}
      <DashboardToggle />
    </div>
  );
}
