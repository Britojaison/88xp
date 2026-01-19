import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
  profile_photo?: string | null;
}

export function useMonthlyScores(month: number, year: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['monthly-scores', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_scores')
        .select(`
          *,
          employee:employees!employee_id(profile_photo)
        `)
        .eq('month', month)
        .eq('year', year)
        .order('total_points', { ascending: false });

      if (error) throw error;

      return (data || []).map((score: any) => ({
        ...score,
        profile_photo: score.employee?.profile_photo || null
      })) as ScoreEntry[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useYearlyScores(year: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['yearly-scores', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearly_scores')
        .select(`
          *,
          employee:employees!employee_id(profile_photo)
        `)
        .eq('year', year)
        .order('total_points', { ascending: false });

      if (error) throw error;

      return (data || []).map((score: any) => ({
        ...score,
        profile_photo: score.employee?.profile_photo || null
      })) as ScoreEntry[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLastMonthScores() {
  const supabase = createClient();
  const now = new Date();
  let lastMonth = now.getMonth();
  let year = now.getFullYear();

  // Handle January case (need to go to December of previous year)
  if (lastMonth === 0) {
    lastMonth = 12;
    year = year - 1;
  }

  return useQuery({
    queryKey: ['last-month-scores', lastMonth, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_scores')
        .select(`
          id,
          employee_id,
          employee_name,
          total_points,
          employee:employees!employee_id(profile_photo)
        `)
        .eq('month', lastMonth)
        .eq('year', year)
        .order('total_points', { ascending: false })
        .limit(3);

      if (error) throw error;

      return (data || []).map((score: any) => ({
        ...score,
        profile_photo: score.employee?.profile_photo || null
      })) as ScoreEntry[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - last month data doesn't change often
  });
}
