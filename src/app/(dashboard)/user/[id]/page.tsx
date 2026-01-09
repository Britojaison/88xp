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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link 
        href="/home" 
        className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Home
      </Link>

      {/* Profile Header */}
      <div 
        className="rounded-[20px] p-6"
        style={{
          backgroundImage: 'url(/Rectangle%2069.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
            {employee.name?.charAt(0).toUpperCase()}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
              <span className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Rank #{employee.rank}
              </span>
            </div>
            <p className="text-cyan-400 text-sm mt-1">{employee.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Member Since: {formatDate(employee.created_at)}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="py-3">
            <p className="text-sm text-gray-400 font-medium">Rank</p>
            <p className="text-2xl font-bold text-white">#{employee.rank}</p>
          </div>
          <div className="py-3 border-l border-gray-600 pl-4">
            <p className="text-sm text-gray-400 font-medium">This Month</p>
            <p className="text-2xl font-bold text-white">
              {monthlyScore?.total_points || 0}
              <span className="text-sm text-gray-400 ml-1">pts</span>
            </p>
            <p className="text-xs text-gray-500">{monthlyScore?.project_count || 0} projects</p>
          </div>
          <div className="py-3 border-l border-gray-600 pl-4">
            <p className="text-sm text-gray-400 font-medium">This Year</p>
            <p className="text-2xl font-bold text-white">
              {yearlyScore?.total_points || 0}
              <span className="text-sm text-gray-400 ml-1">pts</span>
            </p>
            <p className="text-xs text-gray-500">{yearlyScore?.project_count || 0} projects</p>
          </div>
          <div className="py-3 border-l border-gray-600 pl-4">
            <p className="text-sm text-gray-400 font-medium">All Time</p>
            <p className="text-2xl font-bold text-white">{allTimeStats?.length || 0}</p>
            <p className="text-xs text-gray-500">projects completed</p>
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
