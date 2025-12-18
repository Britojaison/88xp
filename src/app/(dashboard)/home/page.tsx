import { createClient } from '@/lib/supabase/server';
import Scoreboard from '@/components/Scoreboard';
import YearlyScoreboard from '@/components/YearlyScoreboard';
import ActiveProjects from '@/components/ActiveProjects';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Match by email since employee.id may differ from auth user.id
  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .ilike('email', user?.email || '')
    .single();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">
          Welcome back, {employee?.name || 'User'}! 👋
        </h1>
        <p className="text-indigo-100 mt-2">
          Track your projects and climb the scoreboard
        </p>
      </div>
      
      {/* Monthly and Yearly Scoreboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Scoreboard />
        <YearlyScoreboard />
      </div>

      {/* Active Projects */}
      <div>
        <ActiveProjects />
      </div>
    </div>
  );
}
