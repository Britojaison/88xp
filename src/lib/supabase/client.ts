import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // During build/SSR, env vars might not be available
  // Return a client anyway - it will fail at runtime if vars are missing
  // This allows the build to complete
  return createBrowserClient(url, key);
}
