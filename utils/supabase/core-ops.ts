import { createServerClient } from '@supabase/ssr'

/**
 * Creates a Supabase admin client configured for the core_ops schema.
 * Uses the service role key to bypass RLS.
 */
export async function createCoreOpsClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            db: { schema: 'core_ops' },
            cookies: {
                getAll() {
                    return []
                },
                setAll() {
                    // No-op for admin client
                },
            },
        }
    )
}
