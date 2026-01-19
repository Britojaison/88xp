import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
    employee: any;
    monthlyScore: any;
    yearlyScore: any;
    monthlyTarget: number;
    totalAllTimePoints: number;
    allMonthlyScores: any[];
    allEmployeesMonthlyScores: any[];
    allYearlyScores: any[];
    allMonthlyTargets: any[];
    completedProjects: any[];
    availableYears: number[];
}

export function useProfileData(userEmail: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['profile-data', userEmail],
        queryFn: async (): Promise<ProfileData | null> => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // First, get the employee data
            const { data: employeeData } = await supabase
                .from('employees')
                .select('id, name, email, rank, is_admin, created_at, profile_photo')
                .ilike('email', userEmail)
                .single();

            if (!employeeData) return null;

            // Only consider years from 2026 onwards
            const startYear = 2026;
            const allYears = Array.from(
                { length: Math.max(currentYear - startYear + 1, 1) },
                (_, i) => currentYear - i
            ).filter(y => y >= startYear);

            // Fetch all data in parallel using Promise.all
            const [
                monthlyScoreRes,
                yearlyScoreRes,
                targetRes,
                allTimeScoresRes,
                projectsRes,
                allMonthlyScoresRes,
                allEmployeesMonthlyScoresRes,
                allYearlyScoresRes,
                allMonthlyTargetsRes,
                completedProjectsRes,
            ] = await Promise.all([
                // Current monthly score
                supabase
                    .from('monthly_scores')
                    .select('total_points, project_count')
                    .eq('employee_id', employeeData.id)
                    .eq('month', currentMonth)
                    .eq('year', currentYear)
                    .single(),

                // Current yearly score
                supabase
                    .from('yearly_scores')
                    .select('total_points, project_count')
                    .eq('employee_id', employeeData.id)
                    .eq('year', currentYear)
                    .single(),

                // Monthly target
                supabase
                    .from('monthly_targets')
                    .select('target_points')
                    .eq('employee_id', employeeData.id)
                    .eq('month', currentMonth)
                    .eq('year', currentYear)
                    .single(),

                // All-time yearly scores (for total points)
                supabase
                    .from('yearly_scores')
                    .select('total_points')
                    .eq('employee_id', employeeData.id),

                // Projects with completed_at (for available years)
                supabase
                    .from('projects')
                    .select('completed_at')
                    .eq('assigned_to', employeeData.id)
                    .in('status', ['completed', 'approved'])
                    .not('completed_at', 'is', null)
                    .order('completed_at', { ascending: false }),

                // All monthly scores for this employee (for badge calculations)
                supabase
                    .from('monthly_scores')
                    .select('month, year, total_points, employee_id')
                    .eq('employee_id', employeeData.id)
                    .in('year', allYears)
                    .order('year', { ascending: false })
                    .order('month', { ascending: false }),

                // All employees' monthly scores (for ranking calculations)
                supabase
                    .from('monthly_scores')
                    .select('month, year, total_points, employee_id')
                    .in('year', allYears)
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                    .order('total_points', { ascending: false }),

                // All yearly scores for ranking
                supabase
                    .from('yearly_scores')
                    .select('year, total_points, employee_id')
                    .in('year', allYears)
                    .order('year', { ascending: false })
                    .order('total_points', { ascending: false }),

                // All monthly targets
                supabase
                    .from('monthly_targets')
                    .select('month, year, target_points, employee_id')
                    .eq('employee_id', employeeData.id)
                    .in('year', allYears),

                // Completed projects for target achievement tracking
                supabase
                    .from('projects')
                    .select('completed_at, points_override, type:project_types(points)')
                    .eq('assigned_to', employeeData.id)
                    .in('status', ['completed', 'approved'])
                    .not('completed_at', 'is', null),
            ]);

            // Calculate total all-time points
            const totalAllTimePoints = (allTimeScoresRes.data || []).reduce(
                (sum: number, s: any) => sum + (s.total_points || 0),
                0
            );

            // Calculate available years from projects
            const projectYears = new Set<number>();
            (projectsRes.data || []).forEach((project: any) => {
                const year = new Date(project.completed_at).getFullYear();
                projectYears.add(year);
            });
            const availableYears = Array.from(projectYears).sort((a, b) => b - a);

            return {
                employee: employeeData,
                monthlyScore: monthlyScoreRes.data,
                yearlyScore: yearlyScoreRes.data,
                monthlyTarget: targetRes.data?.target_points || 100,
                totalAllTimePoints,
                allMonthlyScores: allMonthlyScoresRes.data || [],
                allEmployeesMonthlyScores: allEmployeesMonthlyScoresRes.data || [],
                allYearlyScores: allYearlyScoresRes.data || [],
                allMonthlyTargets: allMonthlyTargetsRes.data || [],
                completedProjects: completedProjectsRes.data || [],
                availableYears: availableYears.length > 0 ? availableYears : [currentYear],
            };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

// Separate hook for fetching badge-specific data that requires additional queries
export function useBadgeData(
    employeeId: string,
    prevMonth: number,
    prevMonthYear: number,
    allMonthlyTargets: any[],
    allMonthlyScores: any[]
) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['badge-data', employeeId, prevMonth, prevMonthYear],
        queryFn: async () => {
            const completedMonthlyTargets = allMonthlyTargets.filter((t: any) => {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                if (t.year < 2026) return false;
                if (t.year < currentYear) return true;
                if (t.year === currentYear && t.month < currentMonth) return true;
                return false;
            });

            const completedMonthlyScores = allMonthlyScores.filter((s: any) => {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                if (s.year < 2026) return false;
                if (s.year < currentYear) return true;
                if (s.year === currentYear && s.month < currentMonth) return true;
                return false;
            });

            const prevMonthTarget = completedMonthlyTargets.find(
                (t: any) => t.month === prevMonth && t.year === prevMonthYear && t.employee_id === employeeId
            );

            const prevMonthScore = completedMonthlyScores.find(
                (s: any) => s.month === prevMonth && s.year === prevMonthYear
            );

            // Only fetch additional data if needed for Lightning Finisher badge
            if (prevMonthYear >= 2026 && prevMonthTarget && prevMonthScore &&
                prevMonthScore.total_points >= prevMonthTarget.target_points) {
                const prevMonthStart = new Date(prevMonthYear, prevMonth - 1, 1);
                const prevMonthEnd = new Date(prevMonthYear, prevMonth, 0);

                const [allEmployeesProjectsRes, allTargetsRes] = await Promise.all([
                    supabase
                        .from('projects')
                        .select('completed_at, points_override, type:project_types(points), assigned_to')
                        .in('status', ['completed', 'approved'])
                        .not('completed_at', 'is', null)
                        .gte('completed_at', prevMonthStart.toISOString())
                        .lte('completed_at', prevMonthEnd.toISOString()),

                    supabase
                        .from('monthly_targets')
                        .select('month, year, target_points, employee_id')
                        .eq('month', prevMonth)
                        .eq('year', prevMonthYear),
                ]);

                return {
                    allEmployeesProjects: allEmployeesProjectsRes.data || [],
                    allTargets: allTargetsRes.data || [],
                };
            }

            return { allEmployeesProjects: [], allTargets: [] };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: prevMonthYear >= 2026, // Only run if valid year
    });
}
