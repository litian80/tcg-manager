/**
 * UX-020: Tournament Templates — system defaults & types
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

// Current Pokémon TCG season age cutoffs (2025-2026 season)
const CURRENT_JR_YEAR = 2015;
const CURRENT_SR_YEAR = 2011;

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
            juniors_birth_year_max: CURRENT_JR_YEAR,
            seniors_birth_year_max: CURRENT_SR_YEAR,
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
            juniors_birth_year_max: CURRENT_JR_YEAR,
            seniors_birth_year_max: CURRENT_SR_YEAR,
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
            juniors_birth_year_max: CURRENT_JR_YEAR,
            seniors_birth_year_max: CURRENT_SR_YEAR,
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
