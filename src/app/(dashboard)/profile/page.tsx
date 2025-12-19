import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfilePointsSection from './ProfilePointsSection';
import ContributionGraph from '@/components/ContributionGraph';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Match by email since employee.id may differ from auth user.id
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .ilike('email', user?.email || '')
    .single();

  // Admin doesn't have profile
  if (employee?.is_admin) {
    redirect('/admin');
  }

  // Get monthly score for current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: monthlyScore } = await supabase
    .from('monthly_scores')
    .select('total_points, project_count')
    .eq('employee_id', employee?.id)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single();

  // Get yearly score
  const { data: yearlyScore } = await supabase
    .from('yearly_scores')
    .select('total_points, project_count')
    .eq('employee_id', employee?.id)
    .eq('year', currentYear)
    .single();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {employee?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{employee?.name}</h2>
            <p className="text-gray-500">{employee?.email}</p>
            <span className="inline-block mt-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full">
              Rank #{employee?.rank}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Rank</p>
            <p className="text-2xl font-bold text-gray-900">#{employee?.rank}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">This Month</p>
            <p className="text-2xl font-bold text-blue-700">
              {monthlyScore?.total_points || 0}
              <span className="text-sm text-blue-400 ml-1">pts</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-sm text-emerald-600 font-medium">This Year ({currentYear})</p>
            <p className="text-2xl font-bold text-emerald-700">
              {yearlyScore?.total_points || 0}
              <span className="text-sm text-emerald-400 ml-1">pts</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
            <p className="text-sm text-violet-600 font-medium">Projects This Year</p>
            <p className="text-2xl font-bold text-violet-700">{yearlyScore?.project_count || 0}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Member since {new Date(employee?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Contribution Graph */}
      <ContributionGraph employeeId={employee?.id || ''} />

      {/* Points breakdown with month/year filtering */}
      <ProfilePointsSection employeeId={employee?.id || ''} />
    </div>
  );
}
