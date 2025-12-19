import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !path.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // For authenticated users, only query DB when role check is actually needed
  if (user?.email) {
    const isLoginPage = path.startsWith('/login');
    const isAdminRoute = path.startsWith('/admin');
    const isStaffRoute = ['/home', '/projects', '/profile'].some(r => path.startsWith(r));
    
    // Only query the database if we're on a route that needs role checking
    if (isLoginPage || isAdminRoute || isStaffRoute) {
      const { data: employee } = await supabase
        .from('employees')
        .select('is_admin')
        .ilike('email', user.email)
        .single();

      const isAdmin = employee?.is_admin === true;

      // Redirect from login to appropriate dashboard
      if (isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = isAdmin ? '/admin' : '/home';
        return NextResponse.redirect(url);
      }

      // Admins cannot access staff routes
      if (isAdmin && isStaffRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }

      // Staff cannot access admin routes
      if (!isAdmin && isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
