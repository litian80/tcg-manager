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

