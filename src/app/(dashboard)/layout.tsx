import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

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
    .select('is_admin, rank, name')
    .ilike('email', user.email!)
    .single();

  // Redirect admins to their own dashboard
  if (employee?.is_admin) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-black">
      <TopNav 
        isAdmin={false} 
        userRank={employee?.rank ?? null} 
        userName={employee?.name || 'User'}
        userEmail={user.email || ''}
        userAvatar={user.user_metadata?.avatar_url || null}
      />
      <main className="pt-[100px] px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 max-w-7xl mx-auto flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
