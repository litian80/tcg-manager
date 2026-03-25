# TCG Manager - Project Backlog

## 📋 Ready for Final UAT (Pending Sign-off)
The following features have been implemented and verified by the development agent. They are now ready for formal User Acceptance Testing.

### [TC-001] Deck Submission Flow (Happy Path)
- **Status**: PASSED (Agent-Verified March 18, 2026).
- **Verified**: Modal behavior, success toasts, and no-reload state updates.

### [TC-002] Deadline Logic & UI Verification
- **Status**: PASSED (Agent-Verified March 18, 2026).
- **Verified**: Countdown timer for urgent deadlines and button disabling for expired ones. Fixed infinite loop bug.

### [TC-003] Parsing & Validation Rules
- **Status**: PASSED (Agent-Verified March 18, 2026).
- **Verified**: Automated script covering malformed lines, 60-card limits, 4-copy rule, Radiant, and ACE SPEC limits.

### [TC-004] Performance & UX Verification
- **Status**: PASSED (Agent-Verified March 18, 2026).
- **Verified**: Instant UI state updates (badges/buttons) without document-level page reload.

---

## 🏗️ Infrastructure & Technical Debt
- [ ] **Global Error Sentry**: Implement a top-level Error Boundary and unified toast system. → [Spec 002](file:///c:/Users/litia/tcg-manager/docs/specs/002-global-error-handling.md)
- [ ] **Middleware Persistence**: Migrate the in-memory role cache in `middleware.ts` to a persistent store (e.g., Redis).
- [ ] **Type Unification**: Consolidate `ParsedCard` and `TournamentPlayer` interfaces into a shared `@/types` directory.

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

## 🎯 UX Review — Approved & Actionable (March 2026)
Items from the full UX review. Decisions noted where the product owner has confirmed direction.

### [UX-001] Role-Aware Homepage ⭐ APPROVED
- **Decision**: Homepage should show role-specific content:
  - **Player**: Upcoming tournaments + past tournaments the player participated in.
  - **Organiser**: All tournaments under their name.
  - **Judge**: Current and upcoming tournaments the user is assigned to as judge.
  - **Unauthenticated**: Public upcoming tournaments + Sign In prompt.
- **Effort**: Large
- **Roles**: All

### [UX-002] Judge Event Discovery ⭐ APPROVED (via UX-001)
- **Decision**: Implied by UX-001 — judges should see their assigned tournaments on homepage. Consider a dedicated `/judge` dashboard or a "My Assigned Events" section on the homepage.
- **Effort**: Medium (if combined with UX-001)
- **Roles**: Judge

### [UX-003] ~~Onboarding Birth Year Bug~~ ✅ FIXED (March 25, 2026)
- **Problem**: Birth year dropdown capped at 2020. Junior players born 2021+ cannot complete onboarding.
- **Fix**: Changed both the client dropdown and server validation to use `new Date().getFullYear()` dynamically.
- **Files**: `app/onboarding/page.tsx`, `actions/onboarding.ts`
- **Effort**: Small
- **Roles**: Player

### [UX-004] Navigation Architecture
- **Problem**: All role-specific pages are hidden behind an avatar dropdown. No persistent nav for Organisers/Admins/Judges. No breadcrumbs.
- **Recommendation**: Add role-aware secondary nav or sidebar. At minimum, persistent "My Tournaments" link in header for Organisers and Judges.
- **Effort**: Medium
- **Roles**: All

### [UX-005] Mobile Sticky Header Fragility
- **Problem**: Division selector and round tabs use hardcoded `top-[80px]` / `top-[125px]` / `top-[135px]` / `top-[180px]` values. Any header height change breaks all sticky positions.
- **Fix**: Use CSS custom properties or relative positioning.
- **Effort**: Small
- **Roles**: Player

### [UX-006] Organiser Dashboard Progressive Disclosure
- **Problem**: 6 management cards shown simultaneously regardless of tournament phase. Greyed-out cards during active tournaments have no explanation.
- **Recommendation**: Tabbed/phased layout: Pre-Tournament (Settings/Roster/TDF), During (Sync/Staff/Penalties), Post (Results/Export).
- **Effort**: Large
- **Roles**: Organiser

### [UX-007] Missing Confirmations & Guard Rails
- **Problems**:
  - TDF Export: No preview/confirmation before download.
  - Auto-Sync: No status indicator for sync health. Silent failure when browser tab closes.
  - Penalty Form: Allows illogical combinations (e.g., "Caution" for "Cheating"). Consider constraining dropdown options based on category/severity.
  - Delete Penalty: Uses `confirm()` instead of `AlertDialog` component.
- **Effort**: Medium
- **Roles**: Organiser, Judge

### [UX-008] Deck List Submission Improvements
- **Problems**:
  - Deadline countdown only warns when < 1 hour. Consider 24h and 6h thresholds.
  - No formatted deck list preview before submission.
- **Effort**: Medium
- **Roles**: Player

### [UX-009] Profile Locked Fields No Recourse
- **Problem**: Player ID and Birth Year are locked after first set with "Contact an administrator to change" but no way to actually do so from the page.
- **Fix**: Add a "Request Change" button (mailto link or in-app request).
- **Effort**: Small
- **Roles**: Player

### [UX-010] Registration Capacity & Waitlist Visibility
- **Problem**: Players can't see how many spots are filled, their waitlist position, or which division they were auto-assigned to.
- **Fix**: Show "12 / 32 Masters spots filled" and "You are #3 on the waitlist".
- **Effort**: Medium
- **Roles**: Player

### [UX-011] ~~Empty State Messaging~~ ✅ FIXED (March 25, 2026)
- **Problem**: Homepage empty state said "Get started by creating a tournament in the admin panel" — wrong for players.
- **Fix**: Role-aware empty states. Admin/Organiser: Trophy icon + "Create your first tournament". Player: Calendar icon + "Check back soon". Unauthenticated: Sign-in link.
- **Files**: `app/page.tsx`
- **Effort**: Small
- **Roles**: All

### [UX-012] Help System Expansion
- **Problem**: Help page (`/help/organizer`) only serves Organisers. No player or judge documentation exists. Help link is only in the organiser dropdown.
- **Recommendation**: Add player help (how to register, submit decks) and judge help (penalties, deck checks, time extensions). Make help discoverable from all roles.
- **Effort**: Medium
- **Roles**: Player, Judge

### [UX-013] Date Formatting Consistency
- **Problem**: Inconsistent date rendering — `toLocaleDateString()` without locale, mixed with `date-fns format()` in judge modals.
- **Fix**: Use `date-fns format()` everywhere (already installed).
- **Effort**: Small
- **Roles**: All

### [UX-014] Admin Tournament Table Not Responsive
- **Problem**: `className="hidden ... md:flex"` — the entire admin table is invisible on mobile.
- **Fix**: Add a responsive card view for small screens or remove the `hidden` class with horizontal scroll.
- **Effort**: Medium
- **Roles**: Admin

### [UX-015] Visual Component Consistency (Polish)
- Upload page uses raw `<button>` instead of `<Button>` component.
- Login page and Header hardcode `bg-gray-*` instead of theme variables.
- Create Tournament uses native `<select>` instead of shadcn `<Select>`.
- **Effort**: Small
- **Roles**: All

### [UX-016] Dark Mode Polish
- **Problem**: Dark mode CSS variables exist but no toggle in UI. Several components hardcode light-mode colours (`bg-white`, `text-gray-900` in judge detail modal).
- **Effort**: Medium
- **Roles**: All

### [UX-017] Tournament Status Label Mapping
- **Problem**: Non-standard statuses (e.g., `"draft"`, `"pending"`) display as raw strings on badges.
- **Fix**: Map all statuses to user-friendly labels.
- **Effort**: Small
- **Roles**: Player

### [UX-018] Easter Egg Performance
- **Problem**: Every MatchCard makes a Supabase call to fetch user profile on mount (for Connect Four). Fires for ALL match cards, not just the user's.
- **Fix**: Only fetch when secret trigger is first activated, or lift the query to tournament-view level.
- **Effort**: Small
- **Roles**: Player

---

## 💬 UX Review — Needs Further Discussion

### [UX-Q5] Admin Panel URL Consolidation
- **Context**: Admin pages are split across `/admin/*` and `/organizer/admin/roles`. The role management page at `/organizer/admin/roles` is under the organizer namespace but is admin-only.
- **Owner Decision**: "Open to further details suggestions."
- **Proposed Plan**:
  1. Move `/organizer/admin/roles` → `/admin/roles`
  2. Consolidate all admin pages under `/admin/*`:
     - `/admin/tournaments` — Tournament administration table
     - `/admin/users` — User search & management
     - `/admin/roles` — Role promotion/demotion
     - `/admin/upload` — TOM file upload
  3. Add a proper admin sidebar/nav linking all admin pages
  4. Update middleware matcher to protect `/admin/*` routes
- **Status**: Awaiting approval of proposed structure.

---

## ❌ UX Review — Decided Against

### [UX-Q3] Post-Tournament CP/Results Summary
- **Decision**: Will NOT implement. All CP-related information is available on the official Pokémon site. Following single source of truth principle — TCG Manager will not duplicate CP publishing.

### [UX-Q4] Rename "Create TOM File" to "Create Tournament"
- **Decision**: Keep as "Create TOM File". The title correctly reflects the handover stage: TCG Manager passes tournament information into a .TDF file. During the tournament, TCG Manager acts only as a presentation layer while TOM handles core operations (pairing, player management, ranking points). TCG Manager adds supplementary data (staff, penalties, deck lists, deck checks) but tournament operations remain TOM's scope.

---

## 🚀 Future Enhancements
- [ ] **Email Notification System**: Automated reminders for deadlines. → [Spec 003](file:///c:/Users/litia/tcg-manager/docs/specs/003-email-notifications.md)
- [ ] **Advanced TDF Configuration**: Support custom categories and birth-year validation. → [Spec 004](file:///c:/Users/litia/tcg-manager/docs/specs/004-advanced-tdf-config.md)
- [ ] **Staff Scoping**: Refine judge permissions for assigned tournaments only.
- [ ] **Roster Performance**: Virtualization for large player lists.
- [ ] **Manual Result Entry**: Judge interface for match results.

---

## ✅ Completed & Verified

### [SPEC-001] Role Management UI
- **Fixed**: Created admin-only dashboard at `/admin/users` with user search and role assignment.
- **Verified**: Database operations and server actions verified in recent sessions.

### [BUG-002] Deck Validation Logic Fix
- **Fixed**: Updated card name validation to prevent invalid names (e.g., "Aurven") and integrated multi-type database lookups.
- **Verified**: Covers Pokémon, Trainer, and Energy cards with full database consistency.

### [BUG-001] Unauthorized Access to Tournament Creation
- **Fixed**: Implemented global RBAC middleware and centralized auth utility.
- **Verified**: Correct redirection for non-admin users.

