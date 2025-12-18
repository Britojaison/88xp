import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  // Redirect admins to their own dashboard
  if (employee?.is_admin) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar isAdmin={false} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
