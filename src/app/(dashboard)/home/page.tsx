import { createClient } from '@/lib/supabase/server';
import DashboardToggle from '@/components/DashboardToggle';

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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">
          Welcome back, {employee?.name || 'User'}! 👋
        </h1>
        <p className="text-indigo-100 mt-2">
          Track your tasks and climb the scoreboard
        </p>
      </div>
      
      {/* Toggle between Scoreboard and All Tasks */}
      <DashboardToggle />
    </div>
  );
}
