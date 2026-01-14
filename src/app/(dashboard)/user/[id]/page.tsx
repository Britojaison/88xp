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

  const { data: targetData } = await supabase
    .from('monthly_targets')
    .select('target_points')
    .eq('employee_id', employee.id)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single();

  // Determine which badges are achieved
  const totalPoints = yearlyScore?.total_points || 0;
  const totalProjects = yearlyScore?.project_count || 0;
  const monthlyPoints = monthlyScore?.total_points || 0;
  const monthlyTarget = targetData?.target_points || 100;
  
  const achievedBadges = new Set<number>();
  // Badge 1: Achieve 50 points (example)
  if (totalPoints >= 50) achievedBadges.add(0);
  // Badge 2: Complete 10 projects (example)
  if (totalProjects >= 10) achievedBadges.add(1);
  // Badge 3: Achieve monthly target (example)
  if (monthlyPoints >= monthlyTarget) achievedBadges.add(2);
  // Badge 4: Achieve 200 points (example)
  if (totalPoints >= 200) achievedBadges.add(3);
  // Badge 5: (customize condition)
  // if (condition) achievedBadges.add(4);
  // Badge 6: (customize condition)
  // if (condition) achievedBadges.add(5);
  // Badge 7: (customize condition)
  // if (condition) achievedBadges.add(6);
  // Badge 8: (customize condition)
  // if (condition) achievedBadges.add(7);
  // Badge 9: (customize condition)
  // if (condition) achievedBadges.add(8);
  // Badge 10: (customize condition)
  // if (condition) achievedBadges.add(9);
  // Badge 11: (customize condition)
  // if (condition) achievedBadges.add(10);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Back link */}
      <Link 
        href="/home" 
        className="inline-flex items-center text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Home
      </Link>

      {/* Main Content Row - Profile Card + Activity Timeline + Badges */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left - Profile Card */}
        <div className="w-full lg:w-[280px] flex-shrink-0">
          <div 
            className="rounded-[20px] p-4 sm:p-5 flex flex-col h-full"
            style={{
              backgroundImage: 'url(/Rectangle%2069.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Avatar */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold overflow-hidden border-2 border-white/20">
                  {employee.name?.charAt(0).toUpperCase()}
                </div>
                {/* Badge overlay using Ellipse 30.png and Vector.png */}
                <div className="absolute -bottom-1 -right-1 w-[20px] h-[20px] sm:w-[23px] sm:h-[23px]">
                  <img src="/Ellipse 30.png" alt="" className="w-full h-full" />
                  <img src="/Vector.png" alt="" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[10px] h-[9px] sm:w-[12px] sm:h-[11px]" />
                </div>
              </div>
            </div>

            {/* Name & Info */}
            <div className="text-center mb-3 sm:mb-4">
              <h2 className="text-[16px] sm:text-[18px] font-semibold text-white">{employee.name}</h2>
              <p className="text-[10px] sm:text-[11px] text-cyan-400 mt-1">{employee.email}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400">
                Member Since: {new Date(employee.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-0 mt-auto">
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[12px] sm:text-[13px]">Rank</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">#{employee.rank || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[12px] sm:text-[13px]">This month</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{monthlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[12px] sm:text-[13px]">This year</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{yearlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white text-[12px] sm:text-[13px]">Annual Projects</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{allTimeStats?.length || 0}</span>
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
            <h3 className="text-white text-[13px] sm:text-[14px] font-semibold mb-2">Badges</h3>
            <div className="rounded-[20px] border border-white/10 p-0">
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5 items-start justify-items-center">
                {[
                  { img: '/1.png', name: 'Triple Crown Champion', desc: 'Highest scorer for 3 continuous months' },
                  { img: '/2.png', name: 'Lightning Finisher', desc: 'Fastest target achiever' },
                  { img: '/3.png', name: 'Annual Legend', desc: 'Highest score of the year' },
                  { img: '/4.png', name: 'Consistency King', desc: 'Top 5 scorer for 4 consecutive months' },
                  { img: '/5.png', name: 'The Unstoppable', desc: 'Hits target before 50% of the month ends' },
                  { img: '/6.png', name: 'Dominator', desc: 'Ranked #1 for 3 different months (not continuous)' },
                  { img: '/7.png', name: 'Beast Mode', desc: 'Exceeds target by 2x' },
                  { img: '/8.png', name: 'The Record Breaker', desc: 'Breaks a platform record' },
                  { img: '/9.png', name: 'Hall Of Fame', desc: 'Yearly top performers' },
                  { img: '/10.png', name: 'The Immortal', desc: 'Never drops below Top 10 for a full year' },
                  { img: '/11.png', name: 'Dynasty Builder', desc: 'Wins Annual Legend badge twice' },
                  { img: '/12.png', name: 'The Juggernaut', desc: 'Exceeds target 3 months in a row' }
                ].map((badge, index) => {
                  const isAchieved = achievedBadges.has(index);
                  return (
                    <div key={index} className="relative w-full aspect-square flex items-center justify-center group">
                      {/* Badge image in grayscale (always black and white) */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={badge.img} 
                          alt={badge.name}
                          className={`w-full h-full object-contain grayscale transition-opacity ${
                            isAchieved ? 'opacity-100' : 'opacity-50'
                          }`}
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                        {/* Lock overlay - only show if not achieved */}
                        {!isAchieved && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-gray-800/80 rounded-full p-1.5 sm:p-2">
                              <svg 
                                className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                          <div className="font-semibold mb-1">{badge.name}</div>
                          <div className="text-gray-300 text-[10px]">{badge.desc}</div>
                          {/* Tooltip arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
