import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
