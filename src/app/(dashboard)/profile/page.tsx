'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import ProfilePointsSection from './ProfilePointsSection';
import ContributionGraph from '@/components/ContributionGraph';
import { MonthlyTarget } from '@/types';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [monthlyScore, setMonthlyScore] = useState<any>(null);
  const [yearlyScore, setYearlyScore] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // Match by email since employee.id may differ from auth user.id
    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, name, email, rank, is_admin, created_at')
      .ilike('email', user?.email || '')
      .single();

    // Admin doesn't have profile
    if (employeeData?.is_admin) {
      redirect('/admin');
    }

    setEmployee(employeeData);

    // Get monthly score for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: monthlyScoreData } = await supabase
      .from('monthly_scores')
      .select('total_points, project_count')
      .eq('employee_id', employeeData?.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    setMonthlyScore(monthlyScoreData);

    // Get yearly score
    const { data: yearlyScoreData } = await supabase
      .from('yearly_scores')
      .select('total_points, project_count')
      .eq('employee_id', employeeData?.id)
      .eq('year', currentYear)
      .single();

    setYearlyScore(yearlyScoreData);

    // Fetch available years from projects
    const { data: projects } = await supabase
      .from('projects')
      .select('completed_at')
      .eq('assigned_to', employeeData?.id)
      .in('status', ['completed', 'approved'])
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (projects && projects.length > 0) {
      // Extract unique years from completed projects
      const years = new Set<number>();
      projects.forEach((project) => {
        const year = new Date(project.completed_at).getFullYear();
        years.add(year);
      });
      
      // Convert to sorted array (newest first)
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
      
      // Set selected year to current year if it exists in data, otherwise most recent year
      if (sortedYears.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      }
    } else {
      // No projects yet, just show current year
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 h-96 rounded-lg"></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="mb-2">
        <p className="text-xs text-white uppercase tracking-wider mb-1">Your Activity & Performance</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white border-b-2 border-white inline-block pb-1">Profile</h1>
      </div>

      {/* Profile Card + Activity Timeline Row */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left - Profile Card (Vertical Layout) */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-gradient-to-b from-[#2A3A4A] to-[#1E2A3A] rounded-2xl shadow-lg border border-gray-700 p-6 text-center">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-[#3A4A5A]">
                {employee?.name?.charAt(0).toUpperCase()}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-purple-500 rounded-full border-3 border-[#2A3A4A] flex items-center justify-center">
                  <span className="text-white text-xs">●</span>
                </div>
              </div>
            </div>

            {/* Name & Email */}
            <h2 className="text-xl font-semibold text-white mb-1">{employee?.name}</h2>
            <p className="text-sm text-white mb-1">{employee?.email}</p>
            <p className="text-xs text-white mb-6">
              Member Since: {new Date(employee?.created_at).toLocaleDateString()}
            </p>

            {/* Stats - Vertical Layout */}
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center py-3 border-t border-gray-700">
                <span className="text-white font-medium">This month</span>
                <span className="text-white font-bold text-lg">{monthlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-gray-700">
                <span className="text-white font-medium">This year</span>
                <span className="text-white font-bold text-lg">{yearlyScore?.total_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-gray-700">
                <span className="text-white font-medium">Annual Projects</span>
                <span className="text-white font-bold text-lg">{yearlyScore?.project_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Activity Timeline (with max width) */}
        <div className="flex-1 max-w-4xl flex items-center gap-4">
          <div className="flex-1 space-y-6">
            <ContributionGraph 
              employeeId={employee?.id || ''} 
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
            
            {/* Badges Section */}
            <div className="bg-[#2A2A2A] rounded-xl p-8 border border-gray-700 shadow-lg">
              <h3 className="text-base font-semibold text-white mb-4">Badges</h3>
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-400 text-sm">No badges yet</p>
              </div>
            </div>
          </div>
          
          {/* Year Selector - Vertical */}
          <div className="flex flex-col gap-2 ml-4">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-3 rounded-xl font-semibold text-lg transition-all ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-[#2A2A2A] text-white hover:bg-[#333333] border border-gray-700'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Points breakdown with month/year filtering */}
      <ProfilePointsSection employeeId={employee?.id || ''} />
    </div>
  );
}
