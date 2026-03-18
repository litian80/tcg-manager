# TCG Manager - Project Backlog

## 📋 Outstanding UAT Testing (Pending)
The following User Acceptance Testing items are pending final verification.

### [TC-001] Deck Submission Flow (Happy Path)
- **Scenario**: Submit a new deck list.
- **Action**: Register for a tournament (requires deck lists), paste valid PTCG Live export, validate, and submit.
- **Expected**: Modal closes, success toast appears, header badge changes to "Deck Submitted", button changes to "Edit Deck List" without page reload.
- **Result**: PASSED (March 18, 2026). Verified modal behavior and no-reload state updates.

### [TC-002] Deadline Logic & UI Verification (Verified)
- **Scenario**: Urgent Deadline (< 1 hour) and Expired Deadline.
- **Action**: Adjust tournament deadline using SQL/Node helpers.
- **Expected**: countdown timer appears when urgent; button disables when expired.
- **Result**: PASSED (March 18, 2026). Fixed infinite loop bug in `TournamentView`.

### [TC-003] Parsing & Validation Rules
- **Scenario**: Invalid format and Partial list (< 60 cards).
- **Action**: Paste invalid data or incomplete decks.
- **Expected**: Relevant error/warning badges appear in the "Preview & Validation" tab.
- **Result**: PASSED (March 18, 2026). Verified via automated script covering malformed lines, deck size limits, 4-copy rule, Radiant, and ACE SPEC limits.

### [TC-004] Performance & UX Verification
- **Scenario**: No-Reload State Update.
- **Action**: Verify UI state changes (badges/buttons) immediately upon action completion without browser refresh.
- **Result**: PASSED (March 18, 2026). Manual verification confirmed badge, button text, and toast update instantly after deck submission with no document-level page reload.

---

## ✅ Completed & Verified
### [TC-001] Deck Submission Flow (Happy Path)
- **Fixed**: Implemented `DeckSubmissionModal` and integrated into `TournamentView`.
- **Verified**: Verified that modal closes, success toast appears, and UI status updates without page reload.

### [BUG-001] Unauthorized Access to Tournament Creation
- **Fixed**: Implemented global RBAC middleware and centralized `lib/auth.ts` utility.
- **Verified**: Users with the `user` role are now correctly redirected from `/organizer/*` routes.

---


---

## 🏗️ Infrastructure & Technical Debt
- [ ] **Role Management UI**: Create an admin-only dashboard to manage user roles. → [Spec 001: Role Management UI](file:///c:/Users/litia/tcg-manager/docs/specs/001-role-management-ui.md)
- [ ] **Global Error Sentry**: Implement a top-level Error Boundary and unified toast system. → [Spec 002: Global Error Handling](file:///c:/Users/litia/tcg-manager/docs/specs/002-global-error-handling.md)
- [ ] **Middleware Persistence**: Migrate the in-memory role cache in `middleware.ts` to a persistent store (e.g., Redis).
- [ ] **Type Unification**: Consolidate `ParsedCard` and `TournamentPlayer` interfaces into a shared `@/types` directory.

---

---

## 🧪 UAT Testing Phases (To Do)
Formal testing phases to be executed by designated UAT testers.

### Phase 1: User Registration & Tournament Flow
*   **Scope**: End-to-end user journey from registration to tournament entry.
*   **Items**:
    *   User registration and profile validation.
    *   Tournament discovery, filtering, and registration.
    *   **[TC-002] Deadline Logic & UI Verification**: Verify timer and button states for urgent/expired deadlines.
*   **Dependencies**: Stable production or staging environment with test data.

### Phase 2: Deck Management & Validation
*   **Scope**: Core functionality for submitting and validating tournament decks.
*   **Items**:
    *   **[TC-001] Deck Submission Flow (Happy Path)**: Validate the complete submission process.
    *   **[TC-003] Parsing & Validation Rules**: Test error handling for invalid/partial deck lists.
    *   **[TC-004] Performance & UX Verification**: Confirm state updates occur without page reloads.
    *   Deck list editing and resubmission.
*   **Dependencies**: Phase 1 completion. User must be registered for a tournament.

### Phase 3: Administrative Controls
*   **Scope**: Features restricted to Organizer and Admin roles.
*   **Items**:
    *   Tournament creation and configuration.
    *   **Role Management UI (Spec 001)**: Test the admin dashboard for assigning user roles (e.g., `user` -> `organizer`).
    *   Player roster management and access controls.
*   **Dependencies**: Access to admin-level test accounts. Role Management UI implementation.

---

## 🚀 Future Enhancements
- [ ] **Email Notification System**: Implement automated reminders for deck submission deadlines. → [Spec 003: Email Notifications](file:///c:/Users/litia/tcg-manager/docs/specs/003-email-notifications.md)
- [ ] **Advanced TDF Configuration**: Support custom categories and birth-year validation. → [Spec 004: Advanced TDF Config](file:///c:/Users/litia/tcg-manager/docs/specs/004-advanced-tdf-config.md)
- [ ] **Staff Scoping**: Refine judge permissions so they only access assigned tournaments.
- [ ] **Roster Performance**: Implement virtualization (e.g., `react-window`) for the player list.
- [ ] **Manual Result Entry**: Allow judges to manually input match results.

