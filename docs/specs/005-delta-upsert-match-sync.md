# Spec 005 - Delta Upsert Match Sync Architecture

> Origin: DeepSeek Reasoner Architectural Evaluation (March 2026)

## Overview
Status: **Approved for Backlog**
Scope: Match Syncing (`app/api/upload-tom/route.ts`)

This plan details the transition from the current "Wipe and Rebuild" match syncing methodology to a "Delta Upsert" architecture, guaranteeing protection for match UUID foreign-keys (like `mini_games`) and preventing Real-time UI connection flickering across the TCG Manager ecosystem.

## 1. Database Layer Modifications

A new migration file must be applied to Postgres to inject an optimized Composite Unique Constraint.
- Creates `idx_match_unique_identifier` enforcing uniqueness across `(tournament_id, round_number, table_number)`.
- This ensures Postgres allows an atomic `UPSERT` on the backend instead of manually checking for existing rows.

## 2. API Layer Refactoring (`upload-tom/route.ts`)

Rebuild the `matches` processing pipeline mapping raw TOM XML to the database:
- **Remove Mass Wipe:** Remove the global `.delete().eq('tournament_id', tournamentId)` occurring before match iteration.
- **Implement Bulk Upsert:** Update the final storage command to use `upsert()` with `onConflict: 'tournament_id, round_number, table_number'` explicitly targeting the new composite constraint.
- **Omit Local Keys (Preservation):** By letting Supabase process strict `UPSERT` commands without including local keys (`time_extension_minutes`, `judge_notes`) in the JSON payload, Postgres automatically preserves the local data for updated rows natively.
- **Data Consistency Transaction:** Entire Sync operation must be wrapped tightly or verified to avoid race-condition read/writes during high-traffic syncs.

## 3. Garbage Collection

When a match is natively deleted or a round removed in TOM, the Upsert model leaves orphaned "ghost" matches in the database.
- **Append a Cleanup Routine:** Implement batched deletion by taking all valid `<round_number, table_number>` pairs found in the XML and securely deleting any ghost matches left behind.
- *(Open Architectural Question)*: Should we physically delete these ghost matches or flag them with a `tombstoned` status so Judges can still audit historical matches from dropped players? (Decision pending during implementation).
