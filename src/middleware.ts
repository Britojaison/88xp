import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login based on role
  if (user?.email && request.nextUrl.pathname.startsWith('/login')) {
    const { data: employee } = await supabase
      .from('employees')
      .select('is_admin')
      .ilike('email', user.email)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = employee?.is_admin ? '/admin' : '/home';
    return NextResponse.redirect(url);
  }

  // Check role-based access
  if (user?.email) {
    const { data: employee } = await supabase
      .from('employees')
      .select('is_admin')
      .ilike('email', user.email)
      .single();

    // Admins cannot access staff routes
    if (employee?.is_admin) {
      const staffRoutes = ['/home', '/projects', '/profile'];
      if (staffRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }

    // Staff cannot access admin routes
    if (!employee?.is_admin && request.nextUrl.pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
