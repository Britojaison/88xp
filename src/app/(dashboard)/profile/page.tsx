'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import ProfilePointsSection from './ProfilePointsSection';
import ContributionGraph from '@/components/ContributionGraph';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [monthlyScore, setMonthlyScore] = useState<any>(null);
  const [yearlyScore, setYearlyScore] = useState<any>(null);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievedBadges, setAchievedBadges] = useState<Set<number>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, name, email, rank, is_admin, created_at')
      .ilike('email', user?.email || '')
      .single();

    if (employeeData?.is_admin) {
      redirect('/admin');
    }

    setEmployee(employeeData);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch monthly score, yearly score, and target in parallel
    const [monthlyScoreRes, yearlyScoreRes, targetRes] = await Promise.all([
      supabase
        .from('monthly_scores')
        .select('total_points, project_count')
        .eq('employee_id', employeeData?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single(),
      supabase
        .from('yearly_scores')
        .select('total_points, project_count')
        .eq('employee_id', employeeData?.id)
        .eq('year', currentYear)
        .single(),
      supabase
        .from('monthly_targets')
        .select('target_points')
        .eq('employee_id', employeeData?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single()
    ]);

    setMonthlyScore(monthlyScoreRes.data);
    setYearlyScore(yearlyScoreRes.data);
    setMonthlyTarget(targetRes.data?.target_points || 100);

    const { data: projects } = await supabase
      .from('projects')
      .select('completed_at')
      .eq('assigned_to', employeeData?.id)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    // Fetch historical data for badge checks
    const allYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
    
    // Fetch all monthly scores for the employee
    const { data: allMonthlyScores } = await supabase
      .from('monthly_scores')
      .select('month, year, total_points, employee_id')
      .eq('employee_id', employeeData?.id)
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

    // Fetch all monthly targets
    const { data: allMonthlyTargets } = await supabase
      .from('monthly_targets')
      .select('month, year, target_points, employee_id')
      .eq('employee_id', employeeData?.id)
      .in('year', allYears);

    // Fetch projects with completion dates for target achievement tracking
    const { data: completedProjects } = await supabase
      .from('projects')
      .select('completed_at, points_override, type:project_types(points)')
      .eq('assigned_to', employeeData?.id)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null);

    // Helper function to get rank for a specific month/year
    const getRankForMonth = (month: number, year: number) => {
      const monthScores = (allEmployeesMonthlyScores || []).filter(
        (s: any) => s.month === month && s.year === year
      );
      const sorted = monthScores.sort((a: any, b: any) => b.total_points - a.total_points);
      const index = sorted.findIndex((s: any) => s.employee_id === employeeData?.id);
      return index >= 0 ? index + 1 : null;
    };

    // Helper function to check if target was achieved before 50% of month
    const checkUnstoppable = async (month: number, year: number) => {
      const target = (allMonthlyTargets || []).find(
        (t: any) => t.month === month && t.year === year
      );
      if (!target) return false;

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const midMonth = new Date(year, month - 1, Math.floor(monthEnd.getDate() / 2));

      const monthProjects = (completedProjects || []).filter((p: any) => {
        const completed = new Date(p.completed_at);
        return completed >= monthStart && completed <= monthEnd;
      });

      let accumulatedPoints = 0;
      for (const project of monthProjects.sort((a: any, b: any) => 
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
      )) {
        const points = project.points_override ?? project.type?.points ?? 0;
        accumulatedPoints += points;
        if (accumulatedPoints >= target.target_points) {
          const completedDate = new Date(project.completed_at);
          return completedDate <= midMonth;
        }
      }
      return false;
    };

    // Determine which badges are achieved
    const achieved = new Set<number>();
    const employeeId = employeeData?.id;

    // Badge 1: Triple Crown Champion - Highest scorer for 3 continuous months
    if (allMonthlyScores && allMonthlyScores.length >= 3) {
      const sortedScores = [...allMonthlyScores].sort((a: any, b: any) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      for (let i = 0; i <= sortedScores.length - 3; i++) {
        const month1 = sortedScores[i];
        const month2 = sortedScores[i + 1];
        const month3 = sortedScores[i + 2];
        
        // Check if consecutive months
        const date1 = new Date(month1.year, month1.month - 1);
        const date2 = new Date(month2.year, month2.month - 1);
        const date3 = new Date(month3.year, month3.month - 1);
        
        const diff1 = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
        const diff2 = (date2.getTime() - date3.getTime()) / (1000 * 60 * 60 * 24);
        
        if (Math.abs(diff1 - 30) < 5 && Math.abs(diff2 - 30) < 5) {
          const rank1 = getRankForMonth(month1.month, month1.year);
          const rank2 = getRankForMonth(month2.month, month2.year);
          const rank3 = getRankForMonth(month3.month, month3.year);
          
          if (rank1 === 1 && rank2 === 1 && rank3 === 1) {
            achieved.add(0);
            break;
          }
        }
      }
    }

    // Badge 2: Lightning Finisher - Fastest target achiever (check current month)
    const currentTarget = targetRes.data?.target_points || 0;
    if (currentTarget > 0 && monthlyScoreRes.data?.total_points >= currentTarget) {
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0);
      const monthProjects = (completedProjects || []).filter((p: any) => {
        const completed = new Date(p.completed_at);
        return completed >= monthStart && completed <= monthEnd;
      });

      // Get all employees' completion times for this month
      const { data: allEmployeesProjects } = await supabase
        .from('projects')
        .select('completed_at, points_override, type:project_types(points), assigned_to')
        .in('status', ['completed', 'approved'])
        .not('completed_at', 'is', null)
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString());

      // Calculate when each employee achieved target
      const employeeTargetTimes: { [key: string]: Date | null } = {};
      if (allEmployeesProjects) {
        const employees = new Set(allEmployeesProjects.map((p: any) => p.assigned_to));
        for (const empId of employees) {
          const empIdStr = String(empId);
          const empProjects = allEmployeesProjects
            .filter((p: any) => p.assigned_to === empId)
            .sort((a: any, b: any) => 
              new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
            );
          
          const empTarget = (allMonthlyTargets || []).find(
            (t: any) => t.employee_id === empId && t.month === currentMonth && t.year === currentYear
          );
          if (!empTarget) continue;

          let accumulated = 0;
          for (const project of empProjects) {
            const points = project.points_override ?? project.type?.points ?? 0;
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
        const isFastest = Object.values(employeeTargetTimes).every((time) => 
          !time || time >= userTargetTime
        );
        if (isFastest) achieved.add(1);
      }
    }

    // Badge 3: Annual Legend - Highest score of the year
    if (yearlyScoreRes.data) {
      const yearScores = (allYearlyScores || []).filter((s: any) => s.year === currentYear);
      const sorted = yearScores.sort((a: any, b: any) => b.total_points - a.total_points);
      if (sorted.length > 0 && sorted[0].employee_id === employeeId) {
        achieved.add(2);
      }
    }

    // Badge 4: Consistency King - Top 5 scorer for 4 consecutive months
    if (allMonthlyScores && allMonthlyScores.length >= 4) {
      const sortedScores = [...allMonthlyScores].sort((a: any, b: any) => {
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
            const rank = getRankForMonth(month.month, month.year);
            if (!rank || rank > 5) {
              allTop5 = false;
              break;
            }
          }
          if (allTop5) {
            achieved.add(3);
            break;
          }
        }
      }
    }

    // Badge 5: The Unstoppable - Hits target before 50% of the month ends
    const unstoppableCheck = await checkUnstoppable(currentMonth, currentYear);
    if (unstoppableCheck) achieved.add(4);

    // Badge 6: Dominator - Ranked #1 for 3 different months (not continuous)
    if (allMonthlyScores) {
      const rank1Months = new Set<string>();
      for (const score of allMonthlyScores) {
        const rank = getRankForMonth(score.month, score.year);
        if (rank === 1) {
          rank1Months.add(`${score.year}-${score.month}`);
        }
      }
      if (rank1Months.size >= 3) achieved.add(5);
    }

    // Badge 7: Beast Mode - Exceeds target by 2x
    if (monthlyScoreRes.data && targetRes.data) {
      if (monthlyScoreRes.data.total_points >= (targetRes.data.target_points * 2)) {
        achieved.add(6);
      }
    }

    // Badge 8: The Record Breaker - Breaks a platform record
    // Check if employee has the highest single month score
    if (allEmployeesMonthlyScores && allMonthlyScores) {
      const maxScore = Math.max(...(allEmployeesMonthlyScores.map((s: any) => s.total_points)));
      const employeeMaxScore = Math.max(...(allMonthlyScores.map((s: any) => s.total_points)));
      if (employeeMaxScore === maxScore && allMonthlyScores.some((s: any) => s.total_points === maxScore)) {
        achieved.add(7);
      }
    }

    // Badge 9: Hall Of Fame - Yearly top performers (top 3)
    if (yearlyScoreRes.data) {
      const yearScores = (allYearlyScores || []).filter((s: any) => s.year === currentYear);
      const sorted = yearScores.sort((a: any, b: any) => b.total_points - a.total_points);
      const top3 = sorted.slice(0, 3);
      if (top3.some((s: any) => s.employee_id === employeeId)) {
        achieved.add(8);
      }
    }

    // Badge 10: The Immortal - Never drops below Top 10 for a full year
    if (allMonthlyScores) {
      const yearScores = allMonthlyScores.filter((s: any) => s.year === currentYear);
      if (yearScores.length >= 12) {
        let allTop10 = true;
        for (const score of yearScores) {
          const rank = getRankForMonth(score.month, score.year);
          if (!rank || rank > 10) {
            allTop10 = false;
            break;
          }
        }
        if (allTop10) achieved.add(9);
      }
    }

    // Badge 11: Dynasty Builder - Wins Annual Legend badge twice
    let annualLegendCount = 0;
    for (const year of allYears) {
      const yearScores = (allYearlyScores || []).filter((s: any) => s.year === year);
      if (yearScores.length > 0) {
        const sorted = yearScores.sort((a: any, b: any) => b.total_points - a.total_points);
        if (sorted[0].employee_id === employeeId) {
          annualLegendCount++;
        }
      }
    }
    if (annualLegendCount >= 2) achieved.add(10);

    // Badge 12: The Juggernaut - Exceeds target 3 months in a row
    if (allMonthlyScores && allMonthlyTargets) {
      const sortedScores = [...allMonthlyScores].sort((a: any, b: any) => {
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
            const target = allMonthlyTargets.find(
              (t: any) => t.month === month.month && t.year === month.year
            );
            if (!target || month.total_points < target.target_points) {
              allExceedTarget = false;
              break;
            }
          }
          if (allExceedTarget) {
            achieved.add(11);
            break;
          }
        }
      }
    }
    
    setAchievedBadges(achieved);

    if (projects && projects.length > 0) {
      const years = new Set<number>();
      projects.forEach((project: any) => {
        const year = new Date(project.completed_at).getFullYear();
        years.add(year);
      });
      
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
      
      if (sortedYears.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      }
    } else {
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-96 rounded-lg"></div>;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Calculate target progress
  const currentPoints = monthlyScore?.total_points || 0;
  const targetPoints = monthlyTarget || 100;
  const completedPercentage = Math.min(Math.round((currentPoints / targetPoints) * 100), 100);
  const pointsRemaining = Math.max(targetPoints - currentPoints, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Row with Monthly Target */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <p className="text-white text-[12px] sm:text-[13px] font-light">Your Activity & Performance</p>
          <h1 className="text-[28px] sm:text-[36px] lg:text-[40px] font-light text-white leading-none">Profile</h1>
          <div className="h-1 w-[100px] sm:w-[120px] bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-1"></div>
        </div>
        
        {/* Monthly Target Widget - Top right near navbar, no border */}
        <div className="w-full sm:w-[220px]">
          <h3 className="text-white text-[14px] sm:text-[16px] font-semibold text-center mb-2 sm:mb-3">Monthly Target</h3>
          <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4">
            {/* Circular Progress */}
            <div className="relative w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3A3A3A" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${completedPercentage * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7A96C9" />
                    <stop offset="52%" stopColor="#9B86C6" />
                    <stop offset="100%" stopColor="#B37DC5" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-[9px] sm:text-[11px] font-bold">{currentPoints}/{targetPoints}</span>
                <span className="text-gray-400 text-[7px] sm:text-[8px]">pts</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex flex-col gap-1 sm:gap-2">
              <div>
                <span className="text-white text-[16px] sm:text-[20px] font-bold">{completedPercentage}%</span>
                <p className="text-gray-400 text-[9px] sm:text-[10px]">Completed</p>
              </div>
              <div>
                <span className="text-white text-[16px] sm:text-[20px] font-bold">{pointsRemaining}</span>
                <p className="text-gray-400 text-[9px] sm:text-[10px]">points remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left - Profile Card */}
        <div className="w-full lg:w-[280px] flex-shrink-0">
          <div 
            className="rounded-[20px] p-4 sm:p-5 flex flex-col"
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
                  {employee?.name?.charAt(0).toUpperCase()}
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
              <h2 className="text-[16px] sm:text-[18px] font-semibold text-white">{employee?.name}</h2>
              <p className="text-[10px] sm:text-[11px] text-cyan-400">{employee?.email}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400">Member Since: {formatDate(employee?.created_at)}</p>
            </div>

            {/* Stats - No horizontal lines */}
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2 sm:py-2.5">
                <span className="text-white text-[12px] sm:text-[13px]">Rank</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">#{employee?.rank || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 sm:py-2.5">
                <span className="text-white text-[12px] sm:text-[13px]">This month</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{monthlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2 sm:py-2.5">
                <span className="text-white text-[12px] sm:text-[13px]">This year</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{yearlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2 sm:py-2.5">
                <span className="text-white text-[12px] sm:text-[13px]">Annual Projects</span>
                <span className="text-white text-[12px] sm:text-[13px] font-semibold">{yearlyScore?.project_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Activity Timeline + Badges */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Activity Timeline */}
          <ContributionGraph 
            employeeId={employee?.id || ''} 
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          
          {/* Badges Section - Below Activity Timeline */}
          <div>
            <h3 className="text-white text-[13px] sm:text-[14px] font-semibold mb-2">Badges</h3>
            <div className="rounded-[20px] border border-white/10 p-0">
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5 items-start justify-items-center">
                {(() => {
                  const allBadges = [
                    { img: '/1.png', name: 'Triple Crown Champion', desc: 'Highest scorer for 3 continuous months', index: 0 },
                    { img: '/2.png', name: 'Lightning Finisher', desc: 'Fastest target achiever', index: 1 },
                    { img: '/3.png', name: 'Annual Legend', desc: 'Highest score of the year', index: 2 },
                    { img: '/4.png', name: 'Consistency King', desc: 'Top 5 scorer for 4 consecutive months', index: 3 },
                    { img: '/5.png', name: 'The Unstoppable', desc: 'Hits target before 50% of the month ends', index: 4 },
                    { img: '/6.png', name: 'Dominator', desc: 'Ranked #1 for 3 different months (not continuous)', index: 5 },
                    { img: '/7.png', name: 'Beast Mode', desc: 'Exceeds target by 2x', index: 6 },
                    { img: '/8.png', name: 'The Record Breaker', desc: 'Breaks a platform record', index: 7 },
                    { img: '/9.png', name: 'Hall Of Fame', desc: 'Yearly top performers', index: 8 },
                    { img: '/10.png', name: 'The Immortal', desc: 'Never drops below Top 10 for a full year', index: 9 },
                    { img: '/11.png', name: 'Dynasty Builder', desc: 'Wins Annual Legend badge twice', index: 10 },
                    { img: '/12.png', name: 'The Juggernaut', desc: 'Exceeds target 3 months in a row', index: 11 }
                  ];
                  
                  // Sort badges: achieved first, then locked (maintaining original order within each group)
                  const sortedBadges = [...allBadges].sort((a, b) => {
                    const aAchieved = achievedBadges.has(a.index);
                    const bAchieved = achievedBadges.has(b.index);
                    if (aAchieved && !bAchieved) return -1;
                    if (!aAchieved && bAchieved) return 1;
                    return a.index - b.index; // Maintain original order within each group
                  });
                  
                  return sortedBadges.map((badge) => {
                    const isAchieved = achievedBadges.has(badge.index);
                    return (
                      <div key={badge.index} className="relative w-full aspect-square flex items-center justify-center group">
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Badge image - grayscale when locked, full color when achieved */}
                          <img 
                            src={badge.img} 
                            alt={badge.name}
                            className={`w-full h-full object-contain transition-all duration-300 ${
                              isAchieved ? 'opacity-100' : 'grayscale opacity-50'
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
                          {/* Tooltip on hover - centered on the badge */}
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
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Points History */}
      <ProfilePointsSection employeeId={employee?.id || ''} />
    </div>
  );
}
