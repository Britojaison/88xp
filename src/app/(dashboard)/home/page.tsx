import { createClient } from '@/lib/supabase/server';
import Scoreboard from '@/components/Scoreboard';
import ActiveProjects from '@/components/ActiveProjects';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .eq('id', user?.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Welcome back, {employee?.name || 'User'}! 👋
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Scoreboard />
        <ActiveProjects />
      </div>
    </div>
  );
}
