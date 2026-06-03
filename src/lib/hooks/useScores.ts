import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ScoreEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  total_points: number;
  project_count: number;
  profile_photo?: string | null;
  is_deleted?: boolean;
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
          *,
          employee:employees!employee_id(profile_photo, is_deleted, email)
        `)
        .eq('month', month)
        .eq('year', year)
        .order('total_points', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map((score: any) => ({
        ...score,
        is_deleted: score.employee?.is_deleted || false,
        profile_photo: score.employee?.profile_photo || null,
        email: score.employee?.email || null
      })) as (ScoreEntry & { email: string | null })[];

      return processedData.filter((score) => {
        if (!score.is_deleted || !score.email || !score.email.includes('_deleted_')) return true;
        
        const timestampStr = score.email.split('_deleted_')[1];
        const timestamp = parseInt(timestampStr, 10);
        if (isNaN(timestamp)) return true;

        const deletedDate = new Date(timestamp);
        const deletedYear = deletedDate.getFullYear();
        const deletedMonth = deletedDate.getMonth() + 1;

        if (year > deletedYear || (year === deletedYear && month > deletedMonth)) {
          return false;
        }

        if (year === deletedYear && month === deletedMonth) {
          return score.project_count > 0 || score.total_points > 0;
        }

        return true;
      });
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
          *,
          employee:employees!employee_id(profile_photo, is_deleted, email)
        `)
        .eq('year', year)
        .order('total_points', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map((score: any) => ({
        ...score,
        is_deleted: score.employee?.is_deleted || false,
        profile_photo: score.employee?.profile_photo || null,
        email: score.employee?.email || null
      })) as (ScoreEntry & { email: string | null })[];

      return processedData.filter((score) => {
        if (!score.is_deleted || !score.email || !score.email.includes('_deleted_')) return true;
        
        const timestampStr = score.email.split('_deleted_')[1];
        const timestamp = parseInt(timestampStr, 10);
        if (isNaN(timestamp)) return true;

        const deletedDate = new Date(timestamp);
        const deletedYear = deletedDate.getFullYear();

        if (year > deletedYear) {
          return false;
        }

        if (year === deletedYear) {
          return score.project_count > 0 || score.total_points > 0;
        }

        return true;
      });
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
          project_count,
          employee:employees!employee_id(profile_photo, is_deleted, email)
        `)
        .eq('month', lastMonth)
        .eq('year', year)
        .order('total_points', { ascending: false })
        .limit(3);

      if (error) throw error;

      const processedData = (data || []).map((score: any) => ({
        ...score,
        is_deleted: score.employee?.is_deleted || false,
        profile_photo: score.employee?.profile_photo || null,
        email: score.employee?.email || null
      })) as (ScoreEntry & { email: string | null })[];

      return processedData.filter((score) => {
        if (!score.is_deleted || !score.email || !score.email.includes('_deleted_')) return true;
        
        const timestampStr = score.email.split('_deleted_')[1];
        const timestamp = parseInt(timestampStr, 10);
        if (isNaN(timestamp)) return true;

        const deletedDate = new Date(timestamp);
        const deletedYear = deletedDate.getFullYear();
        const deletedMonth = deletedDate.getMonth() + 1;

        if (year > deletedYear || (year === deletedYear && lastMonth > deletedMonth)) {
          return false;
        }

        if (year === deletedYear && lastMonth === deletedMonth) {
          return score.project_count > 0 || score.total_points > 0;
        }

        return true;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - last month data doesn't change often
  });
}
