import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware');
    // Allow the request to proceed if env vars are missing (will fail at page level)
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  let user = null;
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    console.error('Error getting user in middleware:', error);
    // If auth fails, allow request to proceed (will be handled at page level)
    return supabaseResponse;
  }

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
      let isAdmin = false;
      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('is_admin')
          .ilike('email', user.email)
          .single();

        isAdmin = employee?.is_admin === true;
      } catch (error) {
        console.error('Error checking employee role in middleware:', error);
        // If DB query fails, allow request to proceed (will be handled at page level)
        return supabaseResponse;
      }

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
