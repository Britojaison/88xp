import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default async function AdminLayout({
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
    .select('is_admin, name')
    .ilike('email', user.email!)
    .single();

  if (!employee?.is_admin) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <TopNav 
        isAdmin={true} 
        userName={employee?.name || 'Admin'}
        userEmail={user.email || ''}
        userAvatar={user.user_metadata?.avatar_url || null}
      />
      <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 max-w-7xl mx-auto flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
