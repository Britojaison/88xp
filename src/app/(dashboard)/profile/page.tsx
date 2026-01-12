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

    if (projects && projects.length > 0) {
      const years = new Set<number>();
      projects.forEach((project) => {
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
    <div className="space-y-5">
      {/* Header Row with Monthly Target */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white text-[13px] font-light">Your Activity & Performance</p>
          <h1 className="text-[40px] font-light text-white leading-none">Profile</h1>
          <div className="h-1 w-[120px] bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full mt-1"></div>
        </div>
        
        {/* Monthly Target Widget - Top right near navbar, no border */}
        <div className="p-4 w-[220px]">
          <h3 className="text-white text-[16px] font-semibold text-center mb-3">Monthly Target</h3>
          <div className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative w-[90px] h-[90px] flex-shrink-0">
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
                <span className="text-white text-[11px] font-bold">{currentPoints}/{targetPoints}</span>
                <span className="text-gray-400 text-[8px]">pts</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-white text-[20px] font-bold">{completedPercentage}%</span>
                <p className="text-gray-400 text-[10px]">Completed</p>
              </div>
              <div>
                <span className="text-white text-[20px] font-bold">{pointsRemaining}</span>
                <p className="text-gray-400 text-[10px]">points remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="flex gap-4">
        {/* Left - Profile Card */}
        <div className="w-[280px] flex-shrink-0">
          <div 
            className="rounded-[20px] p-5 flex flex-col"
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
                  {employee?.name?.charAt(0).toUpperCase()}
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
              <h2 className="text-[18px] font-semibold text-white">{employee?.name}</h2>
              <p className="text-[11px] text-cyan-400">{employee?.email}</p>
              <p className="text-[10px] text-gray-400">Member Since: {formatDate(employee?.created_at)}</p>
            </div>

            {/* Stats - No horizontal lines */}
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-white text-[13px]">Rank</span>
                <span className="text-white text-[13px] font-semibold">#{employee?.rank || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-white text-[13px]">This month</span>
                <span className="text-white text-[13px] font-semibold">{monthlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-white text-[13px]">This year</span>
                <span className="text-white text-[13px] font-semibold">{yearlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-white text-[13px]">Annual Projects</span>
                <span className="text-white text-[13px] font-semibold">{yearlyScore?.project_count || 0}</span>
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
      <ProfilePointsSection employeeId={employee?.id || ''} />
    </div>
  );
}
