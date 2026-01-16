import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  created_at: string;
  assignee: { name: string } | null;
  brand: { name: string } | null;
  type: { name: string } | null;
}

export function useProjects(filterMonth?: number, filterYear?: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['projects', filterMonth, filterYear],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, created_at, assignee:employees!assigned_to(name), brand:brands(name), type:project_types(name)')
        .order('created_at', { ascending: false });

      // Apply date filters if specified
      if (filterYear && filterYear > 0) {
        const startOfYear = `${filterYear}-01-01`;
        const endOfYear = `${filterYear}-12-31`;
        
        if (filterMonth && filterMonth > 0) {
          const startOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(filterYear, filterMonth, 0).getDate();
          const endOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;
          
          query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth + 'T23:59:59');
        } else {
          query = query.gte('created_at', startOfYear).lte('created_at', endOfYear + 'T23:59:59');
        }
      } else if (filterMonth && filterMonth > 0) {
        const currentYear = new Date().getFullYear();
        const startOfMonth = `${currentYear}-${String(filterMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, filterMonth, 0).getDate();
        const endOfMonth = `${currentYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;
        
        query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
        brand: Array.isArray(p.brand) ? p.brand[0] : p.brand,
        type: Array.isArray(p.type) ? p.type[0] : p.type,
      })) as Project[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useContributions(employeeId: string, selectedYear?: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['contributions', employeeId, selectedYear],
    queryFn: async () => {
      const now = new Date();
      const currentYear = selectedYear || now.getFullYear();
      const isCurrentYear = currentYear === now.getFullYear();
      
      let startDate: Date;
      let endDate: Date;
      
      if (isCurrentYear) {
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 365);
      } else {
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, completed_at, points_override, type:project_types(points)')
        .eq('assigned_to', employeeId)
        .in('status', ['completed', 'approved'])
        .not('completed_at', 'is', null)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      const contributionMap = new Map<string, { count: number; points: number }>();
      let totalPts = 0;
      
      (data || []).forEach((project: any) => {
        const dateKey = project.completed_at.split('T')[0];
        const typeData = Array.isArray(project.type) ? project.type[0] : project.type;
        const points = project.points_override ?? typeData?.points ?? 0;
        
        if (contributionMap.has(dateKey)) {
          const existing = contributionMap.get(dateKey)!;
          existing.count += 1;
          existing.points += points;
        } else {
          contributionMap.set(dateKey, { count: 1, points });
        }
        totalPts += points;
      });

      return {
        contributions: contributionMap,
        totalProjects: data?.length || 0,
        totalPoints: totalPts,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
