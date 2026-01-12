import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ContributionGraph from '@/components/ContributionGraph';
import UserPointsHistory from './UserPointsHistory';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee || employee.is_admin) {
    notFound();
  }

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

  const { data: yearlyScore } = await supabase
    .from('yearly_scores')
    .select('total_points, project_count')
    .eq('employee_id', employee.id)
    .eq('year', currentYear)
    .single();

  const { data: allTimeStats } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('assigned_to', employee.id)
    .in('status', ['completed', 'approved']);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link 
        href="/home" 
        className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Home
      </Link>

      {/* Main Content Row - Profile Card + Activity Timeline + Badges */}
      <div className="flex gap-4">
        {/* Left - Profile Card */}
        <div className="w-[280px] flex-shrink-0">
          <div 
            className="rounded-[20px] p-5 flex flex-col h-full"
            style={{
              backgroundImage: 'url(/Rectangle%2069.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Avatar */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="w-[80px] h-[80px] bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-2 border-white/20">
                  {employee.name?.charAt(0).toUpperCase()}
                </div>
                {/* Badge overlay using Ellipse 30.png and Vector.png */}
                <div className="absolute -bottom-1 -right-1 w-[23px] h-[23px]">
                  <img src="/Ellipse 30.png" alt="" className="w-full h-full" />
                  <img src="/Vector.png" alt="" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[12px] h-[11px]" />
                </div>
              </div>
            </div>

            {/* Name & Info */}
            <div className="text-center mb-4">
              <h2 className="text-[18px] font-semibold text-white">{employee.name}</h2>
              <p className="text-[11px] text-cyan-400 mt-1">{employee.email}</p>
              <p className="text-[10px] text-gray-400">
                Member Since: {new Date(employee.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-0 mt-auto">
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[13px]">Rank</span>
                <span className="text-white text-[13px] font-semibold">#{employee.rank || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[13px]">This month</span>
                <span className="text-white text-[13px] font-semibold">{monthlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[13px]">This year</span>
                <span className="text-white text-[13px] font-semibold">{yearlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[13px]">Annual Projects</span>
                <span className="text-white text-[13px] font-semibold">{allTimeStats?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Activity Timeline + Badges */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Activity Timeline */}
          <ContributionGraph employeeId={employee.id} />
          
          {/* Badges Section - Below Activity Timeline */}
          <div>
            <h3 className="text-white text-[14px] font-semibold mb-2">Badges</h3>
            <div className="rounded-[20px] border border-white/10 p-5">
              <div className="flex items-center justify-around">
                <div className="w-[55px] h-[55px] rounded-full bg-gray-700/30 border border-gray-600"></div>
                <div className="w-[55px] h-[55px] rounded-full bg-gray-700/30 border border-gray-600"></div>
                <div className="w-[55px] h-[55px] rounded-full bg-gray-700/30 border border-gray-600"></div>
                <div className="w-[55px] h-[55px] rounded-full bg-gray-700/30 border border-gray-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Points History */}
      <UserPointsHistory employeeId={employee.id} />
    </div>
  );
}
