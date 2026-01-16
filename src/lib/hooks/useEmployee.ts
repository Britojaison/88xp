import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useEmployee(email: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['employee', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('is_admin, rank, name, profile_photo')
        .ilike('email', email)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - employee data rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}
