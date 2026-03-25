import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { TournamentStatusConfig } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date as yyyy-MM-dd */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "yyyy-MM-dd")
}

/** Format a date+time as yyyy-MM-dd HH:mm */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "yyyy-MM-dd HH:mm")
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

/**
 * Map a raw tournament status string to a user-friendly badge config.
 * Unknown statuses are title-cased and shown with an outline badge.
 */
export function getTournamentStatusConfig(status: string): TournamentStatusConfig {
  switch (status) {
    case 'running':
      return { label: 'Live', variant: 'default', className: 'bg-green-600 hover:bg-green-700 text-white' }
    case 'completed':
      return { label: 'Completed', variant: 'secondary', className: '' }
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        variant: 'outline',
        className: '',
      }
  }
}
