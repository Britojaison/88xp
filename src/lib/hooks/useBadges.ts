import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface BadgeStatus {
    has_triple_crown: boolean;
    has_consistency_king: boolean;
    has_annual_legend: boolean;
    has_dominator: boolean;
    has_dynasty_builder: boolean;
    has_beast_mode: boolean;
    has_juggernaut: boolean;
    has_hall_of_fame: boolean;
    has_immortal: boolean;
    has_record_breaker: boolean;
}

// Map of badge view columns to badge indices used in UI
export const BADGE_MAP: Record<keyof Omit<BadgeStatus, 'employee_id' | 'employee_name'>, number> = {
    has_triple_crown: 0,        // Triple Crown Champion
    has_consistency_king: 3,    // Consistency King
    has_annual_legend: 2,       // Annual Legend
    has_dominator: 5,           // Dominator
    has_dynasty_builder: 10,    // Dynasty Builder
    has_beast_mode: 6,          // Beast Mode
    has_juggernaut: 11,         // The Juggernaut
    has_hall_of_fame: 8,        // Hall Of Fame
    has_immortal: 9,            // The Immortal
    has_record_breaker: 7,      // The Record Breaker
};

// Badges that aren't computed in the view (need client-side logic)
// Index 1 = Lightning Finisher (fastest target achiever - needs specific month calculation)
// Index 4 = The Unstoppable (hits target before 50% of month - needs date calculations)

/**
 * Hook to fetch employee badges from the database view
 * Uses the employee_badges view which computes all badge statuses server-side
 * 
 * NOTE: This requires the 007_badge_views_and_indexes.sql migration to be run first.
 * The view may not exist until migration is applied.
 */
export function useEmployeeBadges(employeeId: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['employee-badges', employeeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_badges')
                .select('*')
                .eq('employee_id', employeeId)
                .single();

            if (error) {
                // View might not exist if migration hasn't been run
                console.warn('employee_badges view not found, falling back to client-side calculation:', error.message);
                return null;
            }

            return data as BadgeStatus;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - badges don't change often
        retry: 1, // Only retry once if view doesn't exist
    });
}

/**
 * Hook to fetch completed monthly scores with rankings
 * Uses the completed_monthly_scores view for efficient badge-related queries
 */
export function useCompletedMonthlyScores(employeeId: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['completed-monthly-scores', employeeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('completed_monthly_scores')
                .select('*')
                .eq('employee_id', employeeId)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (error) {
                console.warn('completed_monthly_scores view not found:', error.message);
                return [];
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}

/**
 * Hook to fetch monthly rankings for an employee
 * Uses the monthly_employee_rankings view
 */
export function useMonthlyRankings(employeeId: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['monthly-rankings', employeeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('monthly_employee_rankings')
                .select('*')
                .eq('employee_id', employeeId)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (error) {
                console.warn('monthly_employee_rankings view not found:', error.message);
                return [];
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}

/**
 * Hook to fetch yearly rankings for an employee
 * Uses the yearly_employee_rankings view
 */
export function useYearlyRankings(employeeId: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['yearly-rankings', employeeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('yearly_employee_rankings')
                .select('*')
                .eq('employee_id', employeeId)
                .order('year', { ascending: false });

            if (error) {
                console.warn('yearly_employee_rankings view not found:', error.message);
                return [];
            }

            return data || [];
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}

/**
 * Helper function to convert BadgeStatus to a Set of achieved badge indices
 * For compatibility with existing UI code
 */
export function badgeStatusToSet(status: BadgeStatus | null): Set<number> {
    if (!status) return new Set();

    const achieved = new Set<number>();

    for (const [key, index] of Object.entries(BADGE_MAP)) {
        if (status[key as keyof BadgeStatus]) {
            achieved.add(index);
        }
    }

    return achieved;
}
