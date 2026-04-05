/**
 * UX-020: Tournament Templates — system defaults & types
 * UX-021: Smart Division Defaults — auto-calculated season cutoffs
 *
 * These are fallback defaults used when an organiser has no saved template
 * in the DB. Once they create a tournament, their preferences are saved
 * as a per-organiser, per-mode template in `tournament_templates`.
 */

export type TemplateId = 'league-challenge' | 'league-cup' | 'prerelease' | 'custom';

export interface TournamentFormDefaults {
    tournament_mode: string;
    city: string;
    country: string;
    start_time: string; // "HH:mm" format
    requires_deck_list: boolean;
    deck_submission_cutoff_hours: number;
    registration_open: boolean;
    publish_roster: boolean;
    allow_online_match_reporting: boolean;
    capacity: number;
    capacity_juniors: number;
    capacity_seniors: number;
    capacity_masters: number;
    juniors_birth_year_max: number | null;
    seniors_birth_year_max: number | null;
    payment_required: boolean;
    enable_queue: boolean;
}

export interface TemplateOption {
    id: TemplateId;
    label: string;
    description: string;
    icon: string;
    mode: string; // maps to tournament_mode DB value
    defaults: TournamentFormDefaults;
}

/**
 * UX-021: Calculate Pokémon TCG season age division cutoffs.
 *
 * The Pokémon season runs July → June. So:
 *   - Month ≥ 7 (July+) → season = current_year + 1
 *   - Month < 7          → season = current_year
 *
 * Division birth year thresholds (stable formula verified against official rules):
 *   - Juniors: born in (season − 12) or later
 *   - Seniors: born in (season − 16) to (season − 13)
 *   - Masters: born in (season − 17) or earlier
 *
 * For the 2025-2026 season: Juniors ≥ 2014, Seniors 2010–2013, Masters ≤ 2009
 */
export interface SeasonCutoffs {
    seasonYear: number;
    juniorsBornAfter: number;  // juniors_birth_year_max
    seniorsBornAfter: number;  // seniors_birth_year_max
}

export function getSeasonCutoffs(refDate: Date = new Date()): SeasonCutoffs {
    const year = refDate.getFullYear();
    const month = refDate.getMonth() + 1; // 1-indexed
    const seasonYear = month >= 7 ? year + 1 : year;

    return {
        seasonYear,
        juniorsBornAfter: seasonYear - 12,
        seniorsBornAfter: seasonYear - 16,
    };
}

/**
 * Returns a human-readable season label, e.g. "2025–2026 Season".
 */
export function getSeasonLabel(refDate: Date = new Date()): string {
    const { seasonYear } = getSeasonCutoffs(refDate);
    return `${seasonYear - 1}–${seasonYear} Season`;
}

// Build season-aware defaults at module load time
const { juniorsBornAfter, seniorsBornAfter } = getSeasonCutoffs();

export const SYSTEM_TEMPLATES: TemplateOption[] = [
    {
        id: 'league-challenge',
        label: 'League Challenge',
        description: 'Standard monthly local event. Swiss rounds, Masters division.',
        icon: '⚡',
        mode: 'LEAGUECHALLENGE',
        defaults: {
            tournament_mode: 'LEAGUECHALLENGE',
            city: '',
            country: '',
            start_time: '13:00',
            requires_deck_list: false,
            deck_submission_cutoff_hours: 0,
            registration_open: true,
            publish_roster: true,
            allow_online_match_reporting: false,
            capacity: 0,
            capacity_juniors: 0,
            capacity_seniors: 0,
            capacity_masters: 32,
            juniors_birth_year_max: juniorsBornAfter,
            seniors_birth_year_max: seniorsBornAfter,
            payment_required: false,
            enable_queue: false,
        },
    },
    {
        id: 'league-cup',
        label: 'League Cup',
        description: 'Competitive local event. All divisions, higher capacity.',
        icon: '🏆',
        mode: 'TCG1DAY',
        defaults: {
            tournament_mode: 'TCG1DAY',
            city: '',
            country: '',
            start_time: '10:00',
            requires_deck_list: false,
            deck_submission_cutoff_hours: 0,
            registration_open: true,
            publish_roster: true,
            allow_online_match_reporting: false,
            capacity: 0,
            capacity_juniors: 16,
            capacity_seniors: 16,
            capacity_masters: 64,
            juniors_birth_year_max: juniorsBornAfter,
            seniors_birth_year_max: seniorsBornAfter,
            payment_required: false,
            enable_queue: false,
        },
    },
    {
        id: 'prerelease',
        label: 'Prerelease',
        description: 'New set launch event. Sealed/draft format, no deck lists.',
        icon: '📦',
        mode: 'PRERELEASE',
        defaults: {
            tournament_mode: 'PRERELEASE',
            city: '',
            country: '',
            start_time: '10:00',
            requires_deck_list: false,
            deck_submission_cutoff_hours: 0,
            registration_open: true,
            publish_roster: true,
            allow_online_match_reporting: false,
            capacity: 0,
            capacity_juniors: 0,
            capacity_seniors: 0,
            capacity_masters: 32,
            juniors_birth_year_max: juniorsBornAfter,
            seniors_birth_year_max: seniorsBornAfter,
            payment_required: false,
            enable_queue: false,
        },
    },
];

/**
 * Maps a tournament_mode DB value to the corresponding TemplateId.
 */
export function modeToTemplateId(mode: string): TemplateId | null {
    const map: Record<string, TemplateId> = {
        LEAGUECHALLENGE: 'league-challenge',
        TCG1DAY: 'league-cup',
        PRERELEASE: 'prerelease',
    };
    return map[mode] || null;
}

/**
 * Gets system defaults for a given tournament mode.
 * Falls back to League Challenge if mode is unknown.
 */
export function getSystemDefaults(mode: string): TournamentFormDefaults {
    const template = SYSTEM_TEMPLATES.find((t) => t.mode === mode);
    return template?.defaults ?? SYSTEM_TEMPLATES[0].defaults;
}
