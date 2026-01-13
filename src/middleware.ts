import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Simple in-memory cache for role lookups (edge runtime compatible)
const roleCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 1000; // Prevent memory leak

// Cleanup old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(roleCache.entries());
  
  // Remove expired entries
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_TTL) {
      roleCache.delete(key);
    }
  }
  
  // If still too large, remove oldest entries
  if (roleCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sortedEntries.slice(0, roleCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => roleCache.delete(key));
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Skip middleware for static assets and API routes
  if (path.startsWith('/api/') || path.includes('.')) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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

  // Use getUser for secure auth check
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !path.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // For authenticated users, check role with caching
  if (user?.email) {
    const isLoginPage = path.startsWith('/login');
    const isAdminRoute = path.startsWith('/admin');
    const isStaffRoute = ['/home', '/projects', '/profile', '/targets', '/user'].some(r => path.startsWith(r));
    
    if (isLoginPage || isAdminRoute || isStaffRoute) {
      let isAdmin = false;
      const cacheKey = user.email.toLowerCase();
      const cached = roleCache.get(cacheKey);
      
      // Cleanup cache periodically (every 100 requests approximately)
      if (Math.random() < 0.01) {
        cleanupCache();
      }
      
      // Use cached value if fresh
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        isAdmin = cached.isAdmin;
      } else {
        try {
          const { data: employee } = await supabase
            .from('employees')
            .select('is_admin')
            .ilike('email', user.email)
            .single();

          isAdmin = employee?.is_admin === true;
          roleCache.set(cacheKey, { isAdmin, timestamp: Date.now() });
        } catch {
          return supabaseResponse;
        }
      }

      if (isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = isAdmin ? '/admin' : '/home';
        return NextResponse.redirect(url);
      }

      if (isAdmin && isStaffRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }

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
