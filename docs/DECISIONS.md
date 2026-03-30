# TCG Manager — Decision Log

A living record of product and architecture decisions. Reference this before proposing features or changes to avoid re-asking settled questions.

---

## How to Use This Log

Each decision has:
- **ID**: `DEC-XXX` for easy referencing
- **Date**: When the decision was made
- **Status**: `DECIDED` | `SUPERSEDED` | `REVISIT`
- **Context**: Why the question came up
- **Decision**: What was decided
- **Rationale**: The reasoning behind it

---

## Product Scope & Philosophy

### DEC-001: TCG Manager is a Presentation Layer During Tournaments
- **Date**: 2026-03-25
- **Status**: DECIDED
- **Context**: Naming and scope of tournament creation features prompted a review of what TCG Manager's role is during the tournament lifecycle.
- **Decision**: TCG Manager handles **pre-tournament** operations (registration, roster, TDF generation) and acts as a **presentation layer** during the tournament (displaying pairings, standings). Core tournament operations (pairing generation, result entry, ranking point calculation) are TOM's responsibility.
- **Rationale**: TOM is the official software mandated by Pokémon. TCG Manager adds supplementary value (staff management, penalties, deck lists, deck checks, live visibility via auto-sync) but does not replace TOM's core functions. The `.tdf` file is the handover mechanism between the two systems.

### DEC-002: No Championship Point (CP) Publishing
- **Date**: 2026-03-25
- **Status**: DECIDED
- **Context**: UX review suggested a post-tournament results summary showing CP earned.
- **Decision**: TCG Manager will **not** publish or display Championship Points.
- **Rationale**: All CP-related information is available on the official Pokémon site. Following the **single source of truth** principle — duplicating CP data would create maintenance burden and risk showing stale/incorrect information.

### DEC-003: Keep "Create TOM File" Title
- **Date**: 2026-03-25
- **Status**: DECIDED
- **Context**: UX review suggested renaming to "Create Tournament" for better user mental models.
- **Decision**: Keep the title as **"Create TOM File"** on `/organizer/tournaments/new`.
- **Rationale**: The title accurately reflects the handover stage. The primary output of this action is a `.tdf` file that is loaded into TOM. While a tournament record is also created in the database, the user's mental model should be "I am preparing a file for TOM", not "I am creating a tournament that lives in TCG Manager." This aligns with DEC-001.

---

## Homepage & Navigation

### DEC-004: Role-Aware Homepage
- **Date**: 2026-03-25
- **Status**: DECIDED
- **Context**: Homepage showed all tournaments to all users with no role differentiation. Organisers and Judges had no quick access to their relevant events.
- **Decision**: Homepage should display role-specific content:
  - **Unauthenticated**: Public upcoming tournaments + Sign In prompt
  - **Player**: Upcoming tournaments + past tournaments the player participated in
  - **Organiser**: All tournaments under their name
  - **Judge**: Current and upcoming tournaments the user is assigned to as judge
- **Rationale**: Each role has a distinct primary task when they open the app. A role-aware homepage reduces navigation friction and surfaces the most relevant information immediately.

---

## Architecture & URL Structure

### DEC-005: Admin Panel Consolidation
- **Date**: 2026-03-26
- **Status**: DECIDED
- **Context**: Admin pages were fragmented across `/admin/*` and `/organizer/admin/roles`. The role management page sat under the organizer namespace despite being admin-only.
- **Decision**: All admin pages consolidated under `/admin/*`: tournaments, users, roles, upload. Middleware simplified to protect `/admin/*` only. Role Management added to secondary nav and user dropdown.
- **Rationale**: Centralising admin pages under one namespace simplifies mental model and middleware configuration.

---

## User Roles & Permissions

### DEC-006: Four-Role System
- **Date**: 2026-03-25 (documented from existing implementation)
- **Status**: DECIDED
- **Context**: RBAC system review during UX audit.
- **Decision**: The application has four roles with hierarchical permissions:
  - **Admin**: Full access — user management, tournament management, all organiser + judge capabilities
  - **Organiser**: Can upload TOM files, access judge panel, edit match results (for their tournaments)
  - **Judge**: Can access judge panel and edit match results (for assigned tournaments)
  - **User (Player)**: Can view tournaments, register, submit deck lists
- **Rationale**: Maps directly to real-world Pokémon TCG tournament roles. Organisers need judge-level access to their own events. Admins are platform operators.

---

## Data & Integrations

### DEC-007: TOM as Source of Truth for Tournament Operations
- **Date**: 2026-03-25 (documented from existing implementation)
- **Status**: DECIDED
- **Context**: Clarifying data ownership between TCG Manager and TOM.
- **Decision**: 
  - **TCG Manager owns**: Player profiles, registrations, deck lists, deck checks, penalties, staff assignments, tournament visibility settings
  - **TOM owns**: Pairings, match results, standings, round progression
  - **Sync mechanism**: `.tdf` file export (Web → TOM) and Auto-Sync upload (TOM → Web)
- **Rationale**: TOM is the mandated official software. TCG Manager enhances the experience without replacing the official tooling.

### DEC-008: Pokémon Official Site as Source of Truth for Player Stats
- **Date**: 2026-03-25
- **Status**: DECIDED
- **Context**: Related to DEC-002. Broader principle about what player data TCG Manager should display.
- **Decision**: TCG Manager will not duplicate data that is authoritatively available on official Pokémon platforms (CP, rankings, season standings). It will only manage data it is the primary source for (registrations, deck lists, local penalties).
- **Rationale**: Single source of truth principle. Reduces sync complexity and avoids stale data issues.

---

## Match Sync Architecture

### DEC-009: Delta Upsert for Match Syncing (DB-001)
- **Date**: 2026-03-31
- **Status**: DECIDED
- **Context**: The original match sync implementation used a wipe-and-rebuild strategy (DELETE all + INSERT), which destroyed match UUIDs, cascaded FK deletes to `mini_games` (Connect Four), lost judge-set `time_extension_minutes`, and caused Realtime UI flicker.
- **Decision**: Replaced with a delta upsert architecture:
  - `UNIQUE(tournament_id, round_number, table_number, division)` constraint on `matches`
  - Supabase `.upsert()` with `onConflict` replaces DELETE+INSERT
  - Pre-read + merge pattern preserves `time_extension_minutes` (required because Supabase upsert NULLs omitted columns)
  - Garbage collection deletes orphaned matches (hard delete, not tombstone)
- **Rationale**: 
  - `division` is required in the constraint because TOM assigns table numbers per pod — empirically verified with real tournament data (Jan 2026 CMWC shows table overlap across divisions).
  - Hard delete for orphans (not tombstone) because matches are fully re-derivable from TOM XML.
  - No transaction wrapping needed — failure mode is benign (orphans remain) and self-healing on next sync.

---

<!-- 
Template for new decisions:

### DEC-XXX: [Title]
- **Date**: YYYY-MM-DD
- **Status**: DECIDED | SUPERSEDED | REVISIT
- **Context**: [Why this question came up]
- **Decision**: [What was decided]
- **Rationale**: [Why]
-->
