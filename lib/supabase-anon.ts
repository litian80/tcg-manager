import { createClient } from '@supabase/supabase-js';

/**
 * Cookie-free Supabase client for use inside `unstable_cache`.
 *
 * CRITICAL (PERF-003): The SSR `createClient()` from `@supabase/ssr` reads
 * the current request's auth cookies. If used inside `unstable_cache`, the
 * first user to populate the cache determines the RLS context — an admin
 * could leak privileged data to all subsequent anonymous visitors.
 *
 * This client uses ONLY the anon key, so RLS always sees `role = 'anon'`.
 * Use this for ALL cached public queries. NEVER use `@supabase/ssr`'s
 * createClient inside `unstable_cache`.
 */
export function getAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
