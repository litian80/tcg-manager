# TCG Manager - Project Backlog

> Last updated: March 26, 2026

---

## 🎯 Prioritised Task Queue

Work top-down. Items within each tier are ordered by priority.

### Tier 1 — 🟡 Quick Wins & Foundation (High Priority)

- [ ] **[DB-001] Refactor Match Sync to Delta Upsert** (L) → [Spec 005](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/005-delta-upsert-match-sync.md)
  - Migrate away from wipe-and-rebuild to a strict Upsert architecture.
  - Add composite `UNIQUE` index `(tournament_id, round_number, table_number)` to the `matches` table securely.
  - Refactor TOM Sync API to `INSERT ON CONFLICT UPDATE` instead of `DELETE`.
  - Implement batched, intelligent Garbage Collection (delete or tombstone ghost matches).

### Tier 2 — 🟡 Core UX Improvements

(All Tier 2 tasks complete)

### Tier 3 — 🔵 Large System Features

- [x] **[UX-006] Organiser dashboard progressive disclosure** (L) ✅ (March 26, 2026)
  - Tabbed/phased layout: Pre-Tournament, During, Post-Tournament with URL persistence.

- [x] **[UX-Q5] Admin panel URL consolidation** (S) ✅ (March 26, 2026)
  - Moved `/organizer/admin/roles` → `/admin/roles`. All admin pages under `/admin/*`.

### Tier 4 — 🟢 Polish & Extras

- [ ] **[UX-016] Dark mode polish** (M)
  - Add toggle UI + fix hardcoded light-mode colours.

- [ ] **[UX-012] Help system expansion** (M)
  - Add player help and judge help. Make help discoverable from all roles.

### Tier 5 — ⚪ Future Enhancements (Not Yet Scoped)

- [ ] **Manual Result Entry**: Judge interface for match results. (M)
- [ ] **Roster Virtualisation**: Virtualization for large player lists. (M)
  - _Scoped_: Primary targets are `StandingsView` and `PlayerRoster` (unbounded `.map()` renders). Pairings already partitioned by round+division. At typical scales (≤250 rows of lightweight text+badge), DOM cost is negligible. Breaks `Ctrl+F` and `scrollIntoView` auto-scroll. Only pursue if real jank observed at regional-scale events.
- [ ] **Advanced TDF Configuration** (M) → [Spec 004](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/004-advanced-tdf-config.md)
- [ ] **Email Notification System** (L) → [Spec 003](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/003-email-notifications.md)
- [ ] **Player Dashboard** (S-M)
  - _Scoped_: "My Tournaments" list (cross-tournament aggregation) to keep players informed. Requires new query `getMyTournaments()`, a new page or homepage section showing status, next pairing/table, and final rank. Optional: "My matches only" filter on existing pairings view. No schema changes needed.
- [ ] **External Payment Portal Integration** (M)
  - _Scoped_: Organizer brings their own checkout flow. Updates `use_payment_processor` fields. Requires: (1) DB additions for `payment_url` and `webhook_secret` on tournaments, `pending_payment` status on tournament_players. (2) `RegisterButton` redirects to `payment_url` passing player metadata. (3) New `/api/webhooks/payment` endpoint to receive success flag and upgrade `pending_payment` to `registered` (or `waitlisted`). No internal PCI data handling.


### Deferred — ⏸️ Conditional

- [ ] **[MW-03] Add KV/Redis role cache with TTL** (M)
  - Only needed if MW-02 causes measurable latency. Requires Vercel KV or Upstash Redis. Monitor before implementing.

---

## 🧪 UAT Testing Phases

### Phase 1: User Registration & Tournament Flow ✅ PASSED (March 25, 2026)
- **Scope**: End-to-end user journey from registration to tournament entry.
- **Includes**: Profile validation, discovery, and deadline verification.

### Phase 2: Deck Management & Validation ✅ PASSED (March 25, 2026)
- **Scope**: Core functionality for submitting and validating tournament decks.
- **Includes**: Deck list editing, parsing, and validation rules.

---

## ✅ Completed & Verified

<details>
<summary>Expand completed items (32 items)</summary>

### Infrastructure & Stability
- [x] **[MW-01]** Remove in-memory `profileCache` from middleware ✅ (March 25, 2026)
- [x] **[MW-02]** Direct Supabase role lookup per request ✅ (March 25, 2026)
- [x] **[ERR-01]** Create `app/global-error.tsx` ✅ (March 25, 2026)
- [x] **[ERR-02]** Create `app/error.tsx` ✅ (March 25, 2026)
- [x] **[ERR-03]** Create `safeAction` server action wrapper ✅ (March 25, 2026)
- [x] **[ERR-04]** Migrate existing server actions to `safeAction` ✅ (March 25, 2026)
- [x] **[TYPE-01]** Create `@/types` directory and barrel file ✅ (March 25, 2026)
- [x] **[TYPE-02]** Move deck types to `@/types/deck.ts` ✅ (March 25, 2026)
- [x] **[TYPE-03]** Audit and extract remaining inline types ✅ (March 25, 2026)
- [x] **Staff Scoping** — Judge access refactored to assignment-based model ✅ (March 26, 2026)

### UX Fixes
- [x] **[UX-001]** Role-aware homepage ✅ (March 26, 2026)
- [x] **[UX-002]** Judge event discovery ✅ (March 26, 2026)
- [x] **[UX-004]** Navigation architecture ✅ (March 25, 2026)
- [x] **[UX-008]** Deck list submission improvements ✅ (March 25, 2026)
- [x] **[UX-014]** Admin tournament table responsive view ✅ (March 25, 2026)
- [x] **[UX-017]** Tournament status label mapping ✅ (March 25, 2026)
- [x] **[UX-005]** Fix mobile sticky header fragility ✅ (March 25, 2026)
- [x] **[UX-018]** Easter Egg (Connect Four) performance ✅ (March 25, 2026)
- [x] **[UX-013]** Standardise date formatting to `date-fns` ✅ (March 25, 2026)
- [x] **[UX-011]** Empty State Messaging ✅ (March 25, 2026)
- [x] **[UX-003]** Onboarding Birth Year Bug ✅ (March 25, 2026)
- [x] **[UX-009]** Profile locked fields — add "Request Change" ✅ (March 25, 2026)
- [x] **[UX-015]** Visual component consistency pass ✅ (March 25, 2026)
- [x] **[UX-007]** Confirmations & guard rails ✅ (March 25, 2026)
- [x] **[UX-019]** Global 404 "Stay In Your Lane" page ✅ (March 25, 2026)

### Testing
- [x] **[TC-001]** Deck Submission Flow — PASSED (March 18, 2026)
- [x] **[TC-002]** Deadline Logic & UI Verification — PASSED (March 18, 2026)
- [x] **[TC-003]** Parsing & Validation Rules — PASSED (March 18, 2026)
- [x] **[TC-004]** Performance & UX Verification — PASSED (March 18, 2026)

### Other
- [x] **[SPEC-001]** Role Management UI
- [x] **[BUG-002]** Deck Validation Logic Fix
- [x] **[BUG-001]** Unauthorized Access to Tournament Creation
- [x] **[BUG-003]** Deck parser support for alternative list formats ✅ (March 25, 2026)

</details>

## ❌ Decided Against

- **[UX-Q3]** Post-Tournament CP/Results Summary — CP info available on official Pokémon site.
- **[UX-Q4]** Rename "Create TOM File" to "Create Tournament" — Kept as-is; correctly reflects TDF handover stage.
- **[UX-010]** Registration capacity display — Removed; waitlist position still shown. Capacity box added unnecessary clutter.
