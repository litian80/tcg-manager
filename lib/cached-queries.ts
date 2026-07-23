import { unstable_cache } from 'next/cache';
import { getAnonSupabase } from '@/lib/supabase-anon';

/**
 * Server-side query caching layer (PERF-003).
 *
 * Key design decisions:
 * 1. ALL public queries use getAnonSupabase() — cookie-free, so RLS always
 *    sees role='anon'. This prevents auth-context data leakage.
 * 2. Kill switch: when ENABLE_QUERY_CACHE === 'false', bypass unstable_cache
 *    and run queries fresh. Toggle in Vercel dashboard without redeploy.
 * 3. Tournament-scoped invalidation uses revalidatePath (not tags),
 *    because unstable_cache tags are evaluated at module init — dynamic
 *    `tournament-${id}` tags are broken (id is undefined at that point).
 */

// ─── Kill Switch Wrapper ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maybeCached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keys: string[],
  opts: { revalidate?: number; tags?: string[] }
): T {
  if (process.env.ENABLE_QUERY_CACHE === 'false') return fn;
  return unstable_cache(fn, keys, opts) as unknown as T;
}

// ─── Public Tournament List ────────────────────────────────────────────
// Used on landing page preview (top 3) and future public browse page.
// TTL: 60s. Invalidated via revalidateTag('public-tournaments').

export const getCachedPublicTournaments = maybeCached(
  async (statusFilter: string, limit: number = 20) => {
    const supabase = getAnonSupabase();
    const todayDateOnly = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('tournaments')
      .select('*, tournament_players(count)')
      .or('is_published.eq.true,registration_open.eq.true');

    if (statusFilter === 'upcoming') {
      query = query.gte('date', todayDateOnly);
    } else if (statusFilter === 'past') {
      query = query.lt('date', todayDateOnly);
    }

    const { data, error } = await query
      .order('date', { ascending: statusFilter === 'upcoming' })
      .limit(limit);

    if (error) {
      console.error('[cached-queries] getCachedPublicTournaments error:', error);
      return [];
    }

    // Flatten the Supabase aggregated count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      ...row,
      player_count: row.tournament_players?.[0]?.count ?? 0,
      tournament_players: undefined,
    }));
  },
  ['public-tournaments'],
  { revalidate: 60, tags: ['public-tournaments'] }
);

// ─── Landing Page Stats ────────────────────────────────────────────────
// Counts of tournaments, players, and matches for the hero section.
// TTL: 120s. Invalidated via revalidateTag('landing-stats').

export const getCachedLandingStats = maybeCached(
  async () => {
    const supabase = getAnonSupabase();
    const [tc, pc, mc] = await Promise.all([
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('tournament_players').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
    ]);
    return {
      tournamentCount: tc.count ?? 0,
      playerCount: pc.count ?? 0,
      matchCount: mc.count ?? 0,
    };
  },
  ['landing-stats'],
  { revalidate: 120, tags: ['landing-stats'] }
);

// ─── Public Tournament Detail ──────────────────────────────────────────
// Returns tournament data visible to the anon role via RLS.
// Auth-dependent fields (organizer data, unpublished tournaments) must
// be fetched separately with the authenticated createClient().
// TTL: 10s. Invalidated via revalidatePath('/tournament/${id}').

export const getCachedTournamentDetail = maybeCached(
  async (id: string) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Expected for unpublished tournaments (anon can't see them)
      return null;
    }
    return data;
  },
  ['tournament-detail'],
  { revalidate: 10 }
);

// ─── Public Matches for Tournament ─────────────────────────────────────
// TTL: 5s (short for live events). Invalidated via revalidatePath.

export const getCachedTournamentMatches = maybeCached(
  async (tournamentId: string) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('table_number', { ascending: true });

    if (error) {
      console.error('[cached-queries] getCachedTournamentMatches error:', error);
      return [];
    }
    return data || [];
  },
  ['tournament-matches'],
  { revalidate: 5 }
);

// ─── Public Roster for Tournament ──────────────────────────────────────
// TTL: 10s. Invalidated via revalidatePath.

export const getCachedTournamentRoster = maybeCached(
  async (tournamentId: string) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[cached-queries] getCachedTournamentRoster error:', error);
      return [];
    }
    return data || [];
  },
  ['tournament-roster'],
  { revalidate: 10 }
);

// ─── Detailed Matches (public tournament page) ─────────────────────────
// The public tournament page re-fetches matches on every realtime refresh.
// matches/players are anon-readable (FOR SELECT TO public), so caching here
// collapses N concurrent viewers into one shared read per TTL window — the
// single biggest egress lever during live events. TTL: 5s.
export const getCachedTournamentMatchesDetailed = maybeCached(
  async (id: string) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        round_number,
        table_number,
        player1_tom_id,
        player2_tom_id,
        winner_tom_id,
        division,
        is_finished,
        outcome,
        time_extension_minutes,
        p1_display_record,
        p2_display_record,
        p1_reported_result,
        p2_reported_result,
        player1_win,
        tie,
        player2_win,
        p1:players!player1_tom_id(first_name, last_name),
        p2:players!player2_tom_id(first_name, last_name)
      `)
      .eq('tournament_id', id);

    if (error) {
      console.error('[cached-queries] getCachedTournamentMatchesDetailed error:', error);
      return [];
    }
    return data ?? [];
  },
  ['tournament-matches-detailed'],
  { revalidate: 5 }
);

// ─── Roster with player join (public tournament page) ──────────────────
// tournament_players + players are anon-readable. Deck-list status is fetched
// separately by the caller (deck_lists is auth-scoped, not cached here). TTL: 8s.
export const getCachedTournamentRosterPlayers = maybeCached(
  async (id: string) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from('tournament_players')
      .select(`
        player_id,
        registration_status,
        division,
        player:players!player_id(first_name, last_name, tom_player_id)
      `)
      .eq('tournament_id', id);

    if (error) {
      console.error('[cached-queries] getCachedTournamentRosterPlayers error:', error);
      return [];
    }
    return data ?? [];
  },
  ['tournament-roster-players'],
  { revalidate: 8 }
);

// ─── Sitemap: All Public Tournament IDs ────────────────────────────────
// Used only by app/sitemap.ts. Not wrapped in maybeCached — the route
// file's own `revalidate` already caches this at the route level.
export async function getPublicTournamentSitemapEntries() {
  const supabase = getAnonSupabase();
  const pageSize = 1000;
  let rows: { id: string; created_at: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, created_at')
      .or('is_published.eq.true,registration_open.eq.true')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('[cached-queries] getPublicTournamentSitemapEntries error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
