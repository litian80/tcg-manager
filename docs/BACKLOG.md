# TCG Manager - Project Backlog

> Last updated: March 25, 2026

---

## 🎯 Prioritised Task Queue

All work items in a single queue, ordered by priority. Work top-down.

### Tier 1 — 🔴 Security & Production Stability

- [x] **[MW-01] Remove in-memory `profileCache` from middleware** (XS) ✅ (March 25, 2026)
  - The `Map` in `middleware.ts` is unreliable on Vercel Edge — each invocation gets fresh memory. Remove the `profileCache` Map entirely.
  - **File**: `middleware.ts`

- [x] **[MW-02] Direct Supabase role lookup per request** (XS) ✅ (March 25, 2026)
  - After removing the Map, each middleware hit queries `profiles.role` directly. One query per protected route hit — acceptable for current traffic.
  - **File**: `middleware.ts`
  - > MW-01 and MW-02 should be a single PR.

- [ ] **[MW-03] Add KV/Redis role cache with TTL** (M) — *Deferred*
  - Only needed if MW-02 causes measurable latency. Requires Vercel KV or Upstash Redis. Defer until performance data justifies it.

### Tier 2 — 🟠 Error Handling & Resilience

- [ ] **[ERR-01] Create `app/global-error.tsx`** (S)
  - Catches unhandled errors at the root layout level. Prevents white-screen crashes. → [Spec 002](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/002-global-error-handling.md)

- [ ] **[ERR-02] Create `app/error.tsx`** (S)
  - Catches errors within the root layout's children. Shows branded "Something went wrong" fallback with retry button. → [Spec 002](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/002-global-error-handling.md)

- [ ] **[ERR-03] Create `safeAction` server action wrapper** (S)
  - Utility wrapping all server actions in try/catch, guaranteeing `{ success?: T, error?: string }` return shape. Eliminates raw throws to client. → [Spec 002](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/002-global-error-handling.md)

- [ ] **[ERR-04] Migrate existing server actions to `safeAction`** (M)
  - Refactor all actions in `actions/` to use wrapper. Sonner toasts (already installed) surface errors consistently. → [Spec 002](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/002-global-error-handling.md)

### Tier 3 — 🟡 Quick Wins (Small Effort, High Impact)

- [ ] **[UX-005] Fix mobile sticky header fragility** (S)
  - Replace hardcoded `top-[80px]` etc. with CSS custom properties or relative positioning.
  - **Roles**: Player

- [ ] **[UX-009] Profile locked fields — add "Request Change"** (S)
  - Add mailto or in-app request button next to locked Player ID / Birth Year fields.
  - **Roles**: Player

- [ ] **[UX-013] Standardise date formatting to `date-fns`** (S)
  - Replace all `toLocaleDateString()` with `format()` from already-installed `date-fns`.
  - **Roles**: All

- [ ] **[UX-017] Tournament status label mapping** (S)
  - Map raw statuses (`"draft"`, `"pending"`) to user-friendly badge labels.
  - **Roles**: Player

- [ ] **[UX-015] Visual component consistency pass** (S)
  - Replace raw `<button>` → `<Button>`, native `<select>` → shadcn `<Select>`, hardcoded `bg-gray-*` → theme vars.
  - **Roles**: All

- [ ] **[UX-018] Easter Egg (Connect Four) performance** (S)
  - Move Supabase profile fetch from every MatchCard mount to a single tournament-level query or lazy trigger.
  - **Roles**: Player

### Tier 4 — 🟡 Medium UX Improvements

- [ ] **[UX-007] Confirmations & guard rails** (M)
  - TDF export preview/confirmation, auto-sync status indicator, penalty form category constraints, AlertDialog for delete penalty.
  - **Roles**: Organiser, Judge

- [ ] **[UX-008] Deck list submission improvements** (M)
  - 24h/6h deadline warning thresholds + formatted deck preview before submission.
  - **Roles**: Player

- [ ] **[UX-010] Registration capacity & waitlist visibility** (M)
  - Show "12 / 32 Masters spots filled" and waitlist position to players.
  - **Roles**: Player

- [ ] **[UX-014] Admin tournament table responsive view** (M)
  - Add card-based mobile layout — currently entire table is `hidden` on mobile.
  - **Roles**: Admin

- [ ] **[UX-004] Navigation architecture** (M)
  - Role-aware secondary nav or sidebar. Persistent "My Tournaments" link for Organisers/Judges. Breadcrumbs.
  - **Roles**: All

### Tier 5 — 🟢 Code Quality & Type System

- [ ] **[TYPE-01] Create `@/types` directory and barrel file** (XS)
  - Create `types/index.ts` barrel export file.

- [ ] **[TYPE-02] Move deck types to `@/types/deck.ts`** (S)
  - Move `ParsedCard`, `ParsedDeckCategories`, `DeckParseResult` from `utils/deck-validator.ts` → `types/deck.ts`. Update imports in `utils/deck-validator.ts`, `actions/deck/validation.ts`, `components/tournament/DeckSubmissionModal.tsx`, `app/tournament/[id]/tournament-view.tsx`.

- [ ] **[TYPE-03] Audit and extract remaining inline types** (S)
  - Scan for shared interfaces/types defined inline in components or actions. Move to `@/types/`.

### Tier 6 — 🔵 Large Features

- [ ] **[UX-001] Role-aware homepage** (L)
  - Player: Upcoming + past tournaments. Organiser: Their tournaments. Judge: Assigned events. Unauth: Public tournaments + sign-in prompt.
  - **Roles**: All

- [ ] **[UX-002] Judge event discovery** (M, depends on UX-001)
  - "My Assigned Events" section or dedicated `/judge` dashboard.
  - **Roles**: Judge

- [ ] **[UX-006] Organiser dashboard progressive disclosure** (L)
  - Tabbed/phased layout: Pre-Tournament (Settings/Roster/TDF), During (Sync/Staff/Penalties), Post (Results/Export).
  - **Roles**: Organiser

- [ ] **[UX-012] Help system expansion** (M)
  - Add player help (register, submit decks) and judge help (penalties, deck checks, time extensions). Make help discoverable from all roles.
  - **Roles**: Player, Judge

- [ ] **[UX-016] Dark mode polish** (M)
  - Add toggle UI + fix hardcoded light-mode colours (`bg-white`, `text-gray-900` in judge detail modal, etc.).
  - **Roles**: All

### Tier 7 — ⚪ Future Enhancements (Not Yet Scoped)

- [ ] **Email Notification System** (L) → [Spec 003](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/003-email-notifications.md)
- [ ] **Advanced TDF Configuration** (M) → [Spec 004](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/004-advanced-tdf-config.md)
- [ ] **Staff Scoping**: Refine judge permissions for assigned tournaments only. (M)
- [ ] **Roster Virtualisation**: Virtualization for large player lists. (M)
- [ ] **Manual Result Entry**: Judge interface for match results. (M)

---

## 💬 Needs Further Discussion

### [UX-Q5] Admin Panel URL Consolidation
- **Context**: Admin pages split across `/admin/*` and `/organizer/admin/roles`. Role management page at `/organizer/admin/roles` is under organizer namespace but is admin-only.
- **Owner Decision**: "Open to further details suggestions."
- **Proposed Plan**:
  1. Move `/organizer/admin/roles` → `/admin/roles`
  2. Consolidate all admin pages under `/admin/*`: `/admin/tournaments`, `/admin/users`, `/admin/roles`, `/admin/upload`
  3. Add proper admin sidebar/nav linking all admin pages
  4. Update middleware matcher to protect `/admin/*` routes
- **Status**: Awaiting approval of proposed structure.

---

## ❌ Decided Against

### [UX-Q3] Post-Tournament CP/Results Summary
- **Decision**: Will NOT implement. CP info available on official Pokémon site. Single source of truth principle.

### [UX-Q4] Rename "Create TOM File" to "Create Tournament"
- **Decision**: Keep as "Create TOM File". Correctly reflects the handover stage — TCG Manager passes tournament info into .TDF, while TOM handles core operations.

---

## 🧪 UAT Testing Phases (To Do)

Formal testing phases to be executed by designated UAT testers.

### Phase 1: User Registration & Tournament Flow
- **Scope**: End-to-end user journey from registration to tournament entry.
- **Includes**: Profile validation, discovery, and **[TC-002]** Deadline verification.

### Phase 2: Deck Management & Validation
- **Scope**: Core functionality for submitting and validating tournament decks.
- **Includes**: **[TC-001]**, **[TC-003]**, **[TC-004]**, and deck list editing.

---

## ✅ Completed & Verified

### [UX-011] ~~Empty State Messaging~~ ✅ FIXED (March 25, 2026)
- **Fix**: Role-aware empty states. Admin/Organiser: Trophy icon + "Create your first tournament". Player: Calendar icon + "Check back soon". Unauthenticated: Sign-in link.
- **Files**: `app/page.tsx`

### [UX-003] ~~Onboarding Birth Year Bug~~ ✅ FIXED (March 25, 2026)
- **Fix**: Changed both client dropdown and server validation to use `new Date().getFullYear()` dynamically.
- **Files**: `app/onboarding/page.tsx`, `actions/onboarding.ts`

### [TC-001] Deck Submission Flow (Happy Path) — PASSED (March 18, 2026)
### [TC-002] Deadline Logic & UI Verification — PASSED (March 18, 2026)
### [TC-003] Parsing & Validation Rules — PASSED (March 18, 2026)
### [TC-004] Performance & UX Verification — PASSED (March 18, 2026)

### [SPEC-001] Role Management UI
- **Fixed**: Created admin-only dashboard at `/admin/users` with user search and role assignment.

### [BUG-002] Deck Validation Logic Fix
- **Fixed**: Updated card name validation to prevent invalid names and integrated multi-type database lookups.

### [BUG-001] Unauthorized Access to Tournament Creation
- **Fixed**: Implemented global RBAC middleware and centralized auth utility.
