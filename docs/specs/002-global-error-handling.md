# Spec 002: Global Error Sentry & Handling

## Context
Currently, error handling is somewhat fragmented. The new `handleAuthError` pattern in `lib/auth.ts` is great for auth, but general application errors, database failures, or unexpected client crashes might result in a poor user experience (e.g., the default Next.js error screen).

## Requirements
- **Top-Level Protection**: Catch unhandled runtime errors before they crash the entire application window.
- **Standardized UX**: Display a polite, branded "Something went wrong" UI instead of raw stack traces.
- **Toast Integration**: Provide a unified way to trigger error toasts from anywhere in the app, particularly for Server Action failures.

## Technical Implementation Notes
- **Next.js Error Boundaries**: Implement `error.tsx` and `global-error.tsx` files at the root of the app routing structure.
- **Logging Integration**: (Optional but recommended) Hook the error boundary into a logging service like Sentry or a custom Supabase error log table so we know when users hit silent failures.
- **Server Action Wrapper**: Create a standardized wrapper/utility for all Server Actions that guarantees they always return `{ error?: string, success?: T }` instead of throwing raw exceptions to the client.

## Acceptance Criteria
- [ ] A forced crash in a client component renders the custom fallback UI.
- [ ] A forced throw in a layout renders the global error UI.
- [ ] Server actions that fail gracefully display a standardized toast notification to the user without breaking hydration.
