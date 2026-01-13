import { createBrowserClient } from '@supabase/ssr';

// Singleton pattern to reuse the same client instance
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Reuse existing client instance to prevent memory leaks
  if (clientInstance) {
    return clientInstance;
  }
  
  // During build/SSR, env vars might not be available
  // Return a client anyway - it will fail at runtime if vars are missing
  // This allows the build to complete
  clientInstance = createBrowserClient(url, key);
  return clientInstance;
}

// Optional: Reset client (useful for testing or logout scenarios)
export function resetClient() {
  clientInstance = null;
}
