import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import Footer from '@/components/Footer';
import QueryProvider from '@/lib/query-provider';
import NavigationProgress from '@/components/NavigationProgress';

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
    .select('is_admin, rank, name, profile_photo')
    .ilike('email', user.email!)
    .single();

  // Redirect admins to their own dashboard
  if (employee?.is_admin) {
    redirect('/admin');
  }

  return (
    <QueryProvider>
      <NavigationProgress />
      <div className="min-h-screen" style={{ backgroundColor: '#000509' }}>
        <LeftSidebar 
          userRank={employee?.rank ?? null} 
          userName={employee?.name || 'User'}
          userEmail={user.email || ''}
          userAvatar={employee?.profile_photo || null}
        />
        <main className="ml-[60px] sm:ml-[75px] lg:ml-[90px] xl:ml-[100px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl flex flex-col min-h-screen">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">Loading...</p>
              </div>
            </div>
          }>
            <div className="flex-1">{children}</div>
          </Suspense>
          <Footer />
        </main>
      </div>
    </QueryProvider>
  );
}
