import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface Task {
    id: string;
    name: string;
    status: string;
    assignee: { name: string } | null;
    type: { name: string; points: number } | null;
    points_override: number | null;
    completed_at: string | null;
    created_at: string;
}

interface ActiveProjectsData {
    ongoingTasks: Task[];
    completedTasks: Task[];
}

export function useActiveProjects(selectedMonth: number, selectedYear: number) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['active-projects', selectedMonth, selectedYear],
        queryFn: async (): Promise<ActiveProjectsData> => {
            // Calculate date range for filtering at database level
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedYear, selectedMonth, 0);
            endDate.setHours(23, 59, 59, 999);

            const startDateStr = startDate.toISOString();
            const endDateStr = endDate.toISOString();

            // Fetch both ongoing and completed tasks in parallel
            const [ongoingRes, completedRes] = await Promise.all([
                // Ongoing tasks (filter by created_at)
                supabase
                    .from('projects')
                    .select('id, name, status, points_override, completed_at, created_at, assignee:employees!assigned_to(name), type:project_types(name, points)')
                    .in('status', ['pending', 'in_progress'])
                    .gte('created_at', startDateStr)
                    .lte('created_at', endDateStr)
                    .order('created_at', { ascending: false }),

                // Completed tasks (filter by completed_at)
                supabase
                    .from('projects')
                    .select('id, name, status, points_override, completed_at, created_at, assignee:employees!assigned_to(name), type:project_types(name, points)')
                    .in('status', ['completed', 'approved'])
                    .not('completed_at', 'is', null)
                    .gte('completed_at', startDateStr)
                    .lte('completed_at', endDateStr)
                    .order('completed_at', { ascending: false })
            ]);

            const transform = (items: any[] | null): Task[] => (items || []).map((p: any) => ({
                ...p,
                assignee: Array.isArray(p.assignee) ? p.assignee[0] : p.assignee,
                type: Array.isArray(p.type) ? p.type[0] : p.type,
            }));

            return {
                ongoingTasks: transform(ongoingRes.data),
                completedTasks: transform(completedRes.data),
            };
        },
        staleTime: 60 * 1000, // 1 minute - active projects change frequently
    });
}
