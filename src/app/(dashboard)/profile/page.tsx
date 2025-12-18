import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user?.id)
    .single();

  // Admin doesn't have profile
  if (employee?.is_admin) {
    redirect('/home');
  }

  // Get total approved points
  const { data: stats } = await supabase
    .from('projects')
    .select('points_override, type:project_types(points)')
    .eq('assigned_to', user?.id)
    .eq('status', 'approved');

  const totalPoints = stats?.reduce((sum, p) => {
    const typeData = p.type as unknown as { points: number } | null;
    return sum + (p.points_override || typeData?.points || 0);
  }, 0) || 0;

  const completedCount = stats?.length || 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {employee?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{employee?.name}</h2>
            <p className="text-gray-500">{employee?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Rank</p>
            <p className="text-2xl font-bold">#{employee?.rank}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Points</p>
            <p className="text-2xl font-bold text-blue-600">{totalPoints}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 col-span-2">
            <p className="text-sm text-gray-500">Completed Projects</p>
            <p className="text-2xl font-bold">{completedCount}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            Member since {new Date(employee?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
