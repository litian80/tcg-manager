import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { TournamentStatusConfig } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date as human-friendly "10 Apr 2026". Safely preserves exact YYYY-MM-DD input without timezone shifting. */
export function formatDate(date: string | Date): string {
  // If date is an ISO date string "YYYY-MM-DD", preserve its exact date regardless of timezone
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    const local = new Date(y, m - 1, d); // Construct in local timezone to avoid shift back
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(local);
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

/** Format a date+time with timezone: "10 Apr 2026, 9:00 AM NZST" */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: true,
  }).format(new Date(date))
}

/** Compact date+time (no year) with timezone: "10 Apr, 9:00 AM NZST" — for space-constrained UI */
export function formatDateTimeCompact(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: true,
  }).format(new Date(date))
}

/** Time with timezone: "9:00 AM NZST" */
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: true,
  }).format(new Date(date))
}

/** Time only (no timezone): "9:00 AM" — for in-event context where TZ is obvious */
export function formatTimeShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date))
}

/**
 * Sanitize user input for use in PostgREST .or()/.ilike() filter strings.
 * Escapes characters that have special meaning in PostgREST filter syntax
 * to prevent filter injection attacks.
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove characters that act as PostgREST operators/delimiters
  // This prevents injection of additional filter clauses
  return query.replace(/[,.()"\\]/g, '')
}

/** Human-readable labels for tournament_mode DB values */
export const MODE_LABELS: Record<string, string> = {
  LEAGUECHALLENGE: "League Challenge",
  TCG1DAY: "League Cup",
  PRERELEASE: "Prerelease",
  VGCPREMIER: "VGC Premier",
  GOPREMIER: "GO Premier",
}

/** FEAT-010: Check if a game_type value represents a VGC tournament */
export function isVGCGameType(gameType: string | null | undefined): boolean {
  return gameType === 'VIDEO_GAME'
}

/** Check if a game_type value represents a Pokémon GO tournament */
export function isGOGameType(gameType: string | null | undefined): boolean {
  return gameType === 'GO'
}

/**
 * FEAT-010: Get the appropriate list submission label based on game type.
 * Returns "Team List" for VGC and GO, "Deck List" for TCG.
 */
export function getListLabel(gameType: string | null | undefined): string {
  return (isVGCGameType(gameType) || isGOGameType(gameType)) ? 'Team List' : 'Deck List'
}

/** Format city/country into a single location string */
export function formatLocation(city?: string | null, country?: string | null): string | null {
  if (!city && !country) return null
  if (city && country) return `${city}, ${country}`
  return city || country || null
}

/**
 * Map a raw tournament status string to a user-friendly badge config.
 * Unknown statuses are title-cased and shown with an outline badge.
 */
export function getTournamentStatusConfig(status: string): TournamentStatusConfig {
  switch (status) {
    case 'running':
      return { label: 'Live', variant: 'default', className: 'bg-green-600 hover:bg-green-700 text-white' }
    case 'not_started':
      return { label: 'Upcoming', variant: 'outline', className: 'border-blue-500/50 text-blue-600' }
    case 'completed':
      return { label: 'Completed', variant: 'secondary', className: '' }
    case 'cancelled':
      return { label: 'Cancelled', variant: 'destructive', className: 'bg-red-600 hover:bg-red-700 text-white' }
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        variant: 'outline',
        className: '',
      }
  }
}
