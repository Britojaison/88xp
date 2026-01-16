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
  const employeeId = employee.id;

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

  // Fetch historical data for badge checks
  const allYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Fetch all monthly scores for the employee
  const { data: allMonthlyScores } = await supabase
    .from('monthly_scores')
    .select('month, year, total_points, employee_id')
    .eq('employee_id', employeeId)
    .in('year', allYears)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  // Fetch all monthly scores for ranking calculations
  const { data: allEmployeesMonthlyScores } = await supabase
    .from('monthly_scores')
    .select('month, year, total_points, employee_id')
    .in('year', allYears)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('total_points', { ascending: false });

  // Fetch all yearly scores for ranking
  const { data: allYearlyScores } = await supabase
    .from('yearly_scores')
    .select('year, total_points, employee_id')
    .in('year', allYears)
    .order('year', { ascending: false })
    .order('total_points', { ascending: false });

  // Fetch all monthly targets for this employee
  const { data: allMonthlyTargets } = await supabase
    .from('monthly_targets')
    .select('month, year, target_points, employee_id')
    .eq('employee_id', employeeId)
    .in('year', allYears);

  // Fetch projects with completion dates for target achievement tracking
  const { data: completedProjects } = await supabase
    .from('projects')
    .select('completed_at, points_override, type:project_types(points)')
    .eq('assigned_to', employeeId)
    .in('status', ['completed', 'approved'])
    .not('completed_at', 'is', null);

  // Filter to only include completed months (before current month in 2026+)
  const completedMonthlyScores = (allMonthlyScores || []).filter((s: any) => {
    if (s.year < 2026) return false;
    if (s.year < currentYear) return true;
    if (s.year === currentYear && s.month < currentMonth) return true;
    return false;
  });

  const completedMonthlyTargets = (allMonthlyTargets || []).filter((t: any) => {
    if (t.year < 2026) return false;
    if (t.year < currentYear) return true;
    if (t.year === currentYear && t.month < currentMonth) return true;
    return false;
  });

  const completedYearlyScores = (allYearlyScores || []).filter((s: any) => s.year < currentYear && s.year >= 2026);

  // Helper function to get rank for a specific completed month/year
  const getRankForCompletedMonth = (month: number, year: number) => {
    const monthScores = (allEmployeesMonthlyScores || []).filter(
      (s: any) => s.month === month && s.year === year
    );
    const sorted = monthScores.sort((a: any, b: any) => b.total_points - a.total_points);
    const index = sorted.findIndex((s: any) => s.employee_id === employeeId);
    return index >= 0 ? index + 1 : null;
  };

  // Determine which badges are achieved
  const achievedBadges = new Set<number>();

  // Badge 0: Triple Crown Champion - Rank #1 for 3 consecutive completed months
  if (completedMonthlyScores && completedMonthlyScores.length >= 3) {
    const sortedScores = [...completedMonthlyScores].sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    for (let i = 0; i <= sortedScores.length - 3; i++) {
      const month1 = sortedScores[i];
      const month2 = sortedScores[i + 1];
      const month3 = sortedScores[i + 2];
      
      const date1 = new Date(month1.year, month1.month - 1);
      const date2 = new Date(month2.year, month2.month - 1);
      const date3 = new Date(month3.year, month3.month - 1);
      
      const diff1 = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
      const diff2 = (date2.getTime() - date3.getTime()) / (1000 * 60 * 60 * 24);
      
      if (Math.abs(diff1 - 30) < 5 && Math.abs(diff2 - 30) < 5) {
        const rank1 = getRankForCompletedMonth(month1.month, month1.year);
        const rank2 = getRankForCompletedMonth(month2.month, month2.year);
        const rank3 = getRankForCompletedMonth(month3.month, month3.year);
        
        if (rank1 === 1 && rank2 === 1 && rank3 === 1) {
          achievedBadges.add(0);
          break;
        }
      }
    }
  }

  // Badge 1: Lightning Finisher - Fastest target achiever (check previous completed month)
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  if (prevMonthYear >= 2026) {
    const prevMonthStart = new Date(prevMonthYear, prevMonth - 1, 1);
    const prevMonthEnd = new Date(prevMonthYear, prevMonth, 0);

    const prevMonthTarget = completedMonthlyTargets.find(
      (t: any) => t.month === prevMonth && t.year === prevMonthYear && t.employee_id === employeeId
    );

    const prevMonthScore = completedMonthlyScores.find(
      (s: any) => s.month === prevMonth && s.year === prevMonthYear
    );

    if (prevMonthTarget && prevMonthScore && prevMonthScore.total_points >= prevMonthTarget.target_points) {
      const { data: allEmployeesProjects } = await supabase
        .from('projects')
        .select('completed_at, points_override, type:project_types(points), assigned_to')
        .in('status', ['completed', 'approved'])
        .not('completed_at', 'is', null)
        .gte('completed_at', prevMonthStart.toISOString())
        .lte('completed_at', prevMonthEnd.toISOString());

      const { data: allTargets } = await supabase
        .from('monthly_targets')
        .select('month, year, target_points, employee_id')
        .eq('month', prevMonth)
        .eq('year', prevMonthYear);

      const employeeTargetTimes: { [key: string]: Date | null } = {};
      if (allEmployeesProjects && allTargets) {
        const employees = new Set(allEmployeesProjects.map((p: any) => p.assigned_to));
        for (const empId of employees) {
          const empIdStr = String(empId);
          const empProjects = allEmployeesProjects
            .filter((p: any) => p.assigned_to === empId)
            .sort((a: any, b: any) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
          
          const empTarget = allTargets.find((t: any) => t.employee_id === empId);
          if (!empTarget) continue;

          let accumulated = 0;
          for (const project of empProjects) {
            const projectType = project.type as any;
            const points = project.points_override ?? projectType?.points ?? 0;
            accumulated += points;
            if (accumulated >= empTarget.target_points) {
              employeeTargetTimes[empIdStr] = new Date(project.completed_at);
              break;
            }
          }
        }
      }

      const userTargetTime = employeeTargetTimes[employeeId];
      if (userTargetTime) {
        const isFastest = Object.values(employeeTargetTimes).every((time) => !time || time >= userTargetTime);
        if (isFastest) achievedBadges.add(1);
      }
    }
  }

  // Badge 2: Annual Legend - Highest score of a completed year
  if (completedYearlyScores && completedYearlyScores.length > 0) {
    for (const checkYear of allYears.filter(y => y < currentYear && y >= 2026)) {
      const yearScores = completedYearlyScores.filter((s: any) => s.year === checkYear);
      const sorted = yearScores.sort((a: any, b: any) => b.total_points - a.total_points);
      if (sorted.length > 0 && sorted[0].employee_id === employeeId) {
        achievedBadges.add(2);
        break;
      }
    }
  }

  // Badge 3: Consistency King - Top 5 scorer for 4 consecutive completed months
  if (completedMonthlyScores && completedMonthlyScores.length >= 4) {
    const sortedScores = [...completedMonthlyScores].sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    for (let i = 0; i <= sortedScores.length - 4; i++) {
      const months = sortedScores.slice(i, i + 4);
      let allConsecutive = true;
      let allTop5 = true;
      
      for (let j = 0; j < months.length - 1; j++) {
        const date1 = new Date(months[j].year, months[j].month - 1);
        const date2 = new Date(months[j + 1].year, months[j + 1].month - 1);
        const diff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.abs(diff - 30) > 5) {
          allConsecutive = false;
          break;
        }
      }
      
      if (allConsecutive) {
        for (const month of months) {
          const rank = getRankForCompletedMonth(month.month, month.year);
          if (!rank || rank > 5) {
            allTop5 = false;
            break;
          }
        }
        if (allTop5) {
          achievedBadges.add(3);
          break;
        }
      }
    }
  }

  // Badge 4: The Unstoppable - Hits target before 50% of a completed month ends
  for (const score of completedMonthlyScores) {
    const target = completedMonthlyTargets.find(
      (t: any) => t.month === score.month && t.year === score.year
    );
    if (!target) continue;

    const monthStart = new Date(score.year, score.month - 1, 1);
    const monthEnd = new Date(score.year, score.month, 0);
    const midMonth = new Date(score.year, score.month - 1, Math.floor(monthEnd.getDate() / 2));

    const monthProjects = (completedProjects || []).filter((p: any) => {
      const completed = new Date(p.completed_at);
      return completed >= monthStart && completed <= monthEnd;
    });

    let accumulatedPoints = 0;
    for (const project of monthProjects.sort((a: any, b: any) => 
      new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
    )) {
      const projectType = project.type as any;
      const points = project.points_override ?? projectType?.points ?? 0;
      accumulatedPoints += points;
      if (accumulatedPoints >= target.target_points) {
        const completedDate = new Date(project.completed_at);
        if (completedDate <= midMonth) {
          achievedBadges.add(4);
        }
        break;
      }
    }
    if (achievedBadges.has(4)) break;
  }

  // Badge 5: Dominator - Ranked #1 for 3 different completed months (not continuous)
  if (completedMonthlyScores) {
    const rank1Months = new Set<string>();
    for (const score of completedMonthlyScores) {
      const rank = getRankForCompletedMonth(score.month, score.year);
      if (rank === 1) {
        rank1Months.add(`${score.year}-${score.month}`);
      }
    }
    if (rank1Months.size >= 3) achievedBadges.add(5);
  }

  // Badge 6: Beast Mode - Exceeds target by 2x in a completed month
  for (const score of completedMonthlyScores) {
    const target = completedMonthlyTargets.find(
      (t: any) => t.month === score.month && t.year === score.year
    );
    if (target && score.total_points >= (target.target_points * 2)) {
      achievedBadges.add(6);
      break;
    }
  }

  // Badge 7: The Record Breaker - Highest single-month score across all employees (completed months only)
  const completedAllEmployeesScores = (allEmployeesMonthlyScores || []).filter((s: any) => {
    if (s.year < 2026) return false;
    if (s.year < currentYear) return true;
    if (s.year === currentYear && s.month < currentMonth) return true;
    return false;
  });
  
  if (completedAllEmployeesScores.length > 0 && completedMonthlyScores.length > 0) {
    const maxScore = Math.max(...completedAllEmployeesScores.map((s: any) => s.total_points));
    const employeeMaxScore = Math.max(...completedMonthlyScores.map((s: any) => s.total_points));
    if (employeeMaxScore === maxScore && completedMonthlyScores.some((s: any) => s.total_points === maxScore)) {
      achievedBadges.add(7);
    }
  }

  // Badge 8: Hall Of Fame - Finish in Top 5 for 12 out of 12 months (completed year only)
  if (completedMonthlyScores) {
    for (const checkYear of allYears.filter(y => y < currentYear && y >= 2026)) {
      const yearScores = completedMonthlyScores.filter((s: any) => s.year === checkYear);
      if (yearScores.length >= 12) {
        let allTop5 = true;
        for (const score of yearScores) {
          const rank = getRankForCompletedMonth(score.month, score.year);
          if (!rank || rank > 5) {
            allTop5 = false;
            break;
          }
        }
        if (allTop5) {
          achievedBadges.add(8);
          break;
        }
      }
    }
  }

  // Badge 9: The Immortal - Never drops below Top 10 for a full completed year
  if (completedMonthlyScores) {
    for (const checkYear of allYears.filter(y => y < currentYear && y >= 2026)) {
      const yearScores = completedMonthlyScores.filter((s: any) => s.year === checkYear);
      if (yearScores.length >= 12) {
        let allTop10 = true;
        for (const score of yearScores) {
          const rank = getRankForCompletedMonth(score.month, score.year);
          if (!rank || rank > 10) {
            allTop10 = false;
            break;
          }
        }
        if (allTop10) {
          achievedBadges.add(9);
          break;
        }
      }
    }
  }

  // Badge 10: Dynasty Builder - Wins Annual Legend badge twice (in different completed years)
  let annualLegendCount = 0;
  for (const year of allYears.filter(y => y < currentYear && y >= 2026)) {
    const yearScores = completedYearlyScores.filter((s: any) => s.year === year);
    if (yearScores.length > 0) {
      const sorted = yearScores.sort((a: any, b: any) => b.total_points - a.total_points);
      if (sorted[0].employee_id === employeeId) {
        annualLegendCount++;
      }
    }
  }
  if (annualLegendCount >= 2) achievedBadges.add(10);

  // Badge 11: The Juggernaut - Exceeds target 3 consecutive completed months
  if (completedMonthlyScores && completedMonthlyTargets) {
    const sortedScores = [...completedMonthlyScores].sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    for (let i = 0; i <= sortedScores.length - 3; i++) {
      const months = sortedScores.slice(i, i + 3);
      let allConsecutive = true;
      let allExceedTarget = true;
      
      for (let j = 0; j < months.length - 1; j++) {
        const date1 = new Date(months[j].year, months[j].month - 1);
        const date2 = new Date(months[j + 1].year, months[j + 1].month - 1);
        const diff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.abs(diff - 30) > 5) {
          allConsecutive = false;
          break;
        }
      }
      
      if (allConsecutive) {
        for (const month of months) {
          const target = completedMonthlyTargets.find(
            (t: any) => t.month === month.month && t.year === month.year
          );
          if (!target || month.total_points < target.target_points) {
            allExceedTarget = false;
            break;
          }
        }
        if (allExceedTarget) {
          achievedBadges.add(11);
          break;
        }
      }
    }
  }

  // Sort badges: achieved first, then locked
  const allBadges = [
    { img: '/1.png', name: 'Triple Crown Champion', desc: 'Highest scorer for 3 continuous months', index: 0 },
    { img: '/2.png', name: 'Lightning Finisher', desc: 'Fastest target achiever', index: 1 },
    { img: '/3.png', name: 'Annual Legend', desc: 'Highest score of the year', index: 2 },
    { img: '/4.png', name: 'Consistency King', desc: 'Top 5 scorer for 4 consecutive months', index: 3 },
    { img: '/5.png', name: 'The Unstoppable', desc: 'Hits target before 50% of the month ends', index: 4 },
    { img: '/6.png', name: 'Dominator', desc: 'Ranked #1 for 3 different months (not continuous)', index: 5 },
    { img: '/7.png', name: 'Beast Mode', desc: 'Exceeds target by 2x', index: 6 },
    { img: '/8.png', name: 'The Record Breaker', desc: 'Breaks a platform record', index: 7 },
    { img: '/9.png', name: 'Hall Of Fame', desc: 'Finish in Top 5 for 12 out of 12 months', index: 8 },
    { img: '/10.png', name: 'The Immortal', desc: 'Never drops below Top 10 for a full year', index: 9 },
    { img: '/11.png', name: 'Dynasty Builder', desc: 'Wins Annual Legend badge twice', index: 10 },
    { img: '/12.png', name: 'The Juggernaut', desc: 'Exceeds target 3 months in a row', index: 11 }
  ];
  
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aAchieved = achievedBadges.has(a.index);
    const bAchieved = achievedBadges.has(b.index);
    if (aAchieved && !bAchieved) return -1;
    if (!aAchieved && bAchieved) return 1;
    return a.index - b.index;
  });

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
                {sortedBadges.map((badge) => {
                  const isAchieved = achievedBadges.has(badge.index);
                  return (
                    <div key={badge.index} className="relative w-full aspect-square flex items-center justify-center group">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={badge.img} 
                          alt={badge.name}
                          className={`w-full h-full object-contain transition-all duration-300 ${
                            isAchieved ? 'opacity-100' : 'grayscale opacity-50'
                          }`}
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                        {!isAchieved && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-gray-800/80 rounded-full p-1.5 sm:p-2">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="px-2 py-1.5 bg-gray-900/95 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                            <div className="font-semibold text-[10px]">{badge.name}</div>
                            <div className="text-gray-300 text-[9px]">{badge.desc}</div>
                            <div className={`text-[8px] mt-0.5 ${isAchieved ? 'text-green-400' : 'text-yellow-400'}`}>
                              {isAchieved ? '✓ Achieved!' : '🔒 Locked'}
                            </div>
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
