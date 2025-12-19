import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ContributionGraph from '@/components/ContributionGraph';
import RecentProjects from './RecentProjects';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the employee by ID
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee || employee.is_admin) {
    notFound();
  }

  // Get monthly score for current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: monthlyScore } = await supabase
    .from('monthly_scores')
    .select('total_points, project_count')
    .eq('employee_id', employee.id)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single();

  // Get yearly score
  const { data: yearlyScore } = await supabase
    .from('yearly_scores')
    .select('total_points, project_count')
    .eq('employee_id', employee.id)
    .eq('year', currentYear)
    .single();

  // Get all-time stats
  const { data: allTimeStats } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('assigned_to', employee.id)
    .in('status', ['completed', 'approved']);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link 
        href="/home" 
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Back to Home
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
            {employee.name?.charAt(0).toUpperCase()}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
              <span className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Rank #{employee.rank}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{employee.email}</p>
            <p className="text-sm text-gray-400 mt-2">
              Member since {new Date(employee.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500 font-medium">Rank</p>
            <p className="text-3xl font-bold text-gray-900">#{employee.rank}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">This Month</p>
            <p className="text-3xl font-bold text-blue-700">
              {monthlyScore?.total_points || 0}
              <span className="text-sm text-blue-400 ml-1">pts</span>
            </p>
            <p className="text-xs text-blue-500 mt-1">{monthlyScore?.project_count || 0} projects</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-sm text-emerald-600 font-medium">This Year</p>
            <p className="text-3xl font-bold text-emerald-700">
              {yearlyScore?.total_points || 0}
              <span className="text-sm text-emerald-400 ml-1">pts</span>
            </p>
            <p className="text-xs text-emerald-500 mt-1">{yearlyScore?.project_count || 0} projects</p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
            <p className="text-sm text-violet-600 font-medium">All Time</p>
            <p className="text-3xl font-bold text-violet-700">{allTimeStats?.length || 0}</p>
            <p className="text-xs text-violet-500 mt-1">projects completed</p>
          </div>
        </div>
      </div>

      {/* Contribution Graph */}
      <ContributionGraph employeeId={employee.id} />

      {/* Recent Projects */}
      <RecentProjects employeeId={employee.id} employeeName={employee.name} />
    </div>
  );
}

