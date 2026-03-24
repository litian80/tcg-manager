# TCG Manager - User Acceptance Test (UAT) Plan

**Version:** 1.0
**Date:** March 17, 2026
**Tester:** [Tester's Name/Role]

## 1. Objectives
The primary goal of this UAT is to validate the core functionality of the TCG Manager application from an end-user perspective, ensuring it meets business requirements and provides a seamless, intuitive user experience before wider release. This plan focuses on the Registration, Deck Management, and Admin Control functional areas.

## 2. Test Environment & Prerequisites

### 2.1. Access Details
| Item | Details | Notes |
| :--- | :--- | :--- |
| **Application URL** | `http://localhost:3000` | Local development environment. |
| **Authentication** | **Google OAuth** | Use your authorized Google account to sign in. |
| **Tournament ID** | `169b2315-b40b-4d4e-bcf2-53599888fa13` | TC-001 Tournament. |

### 2.2. Pre-Test Setup
1.  Ensure you have access to a Google account authorized for the application.
2.  Have a valid PTCG Live export string ready for deck submission tests.
3.  Have an invalid/malformed deck string ready for validation tests.
4.  (For Phase 3) Confirm Admin accounts are active.

## 3. Step-by-Step Test Cases

**Instructions:** Execute each test step. Record the **Actual Result** and mark the **Status** as `PASS`, `FAIL`, or `BLOCKED`. Add any observations in the **Notes** column.

### Phase 1: User Registration & Tournament Flow
*Test Objective: Verify a user can register, find a tournament, and sign up for it.*

| Test ID | Test Case / Step | Expected Result | Actual Result | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1-01** | **Navigate to Registration Page** | Registration form is displayed. | | | |
| **P1-02** | **Register a New Account** | Account is created, confirmation message shown, user is logged in. | | | |
| **P1-03** | **Browse Tournaments List** | List of available tournaments displays correctly with key info. | | | |
| **P1-04** | **Register for a Tournament** | Registration is successful. UI updates. | | | |
| **[TC-002]** | **Deadline Logic - Urgent (<1hr)**<br>1. Use setup script to set deadline to < 1hr.<br>2. View tournament page. | Visual countdown timer is prominently displayed. | | | |

### Phase 2: Deck Management & Validation
*Test Objective: Verify users can successfully submit, validate, and manage their tournament deck lists.*

| Test ID | Test Case / Step | Expected Result | Actual Result | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[TC-001]** | **Deck Submission (Happy Path)**<br>1. Go to tournament `169b2315-b40b-4d4e-bcf2-53599888fa13`.<br>2. Click "Register" then "Submit Deck".<br>3. Paste valid 60-card export.<br>4. Click "Submit". | 1. Modal closes.<br>2. Success toast appears.<br>3. Badge updates to "Deck Submitted".<br>4. Button text updates.<br>**No page reload.**<br>*Note: Only 60-card decks are accepted.* | | | |
| **[TC-004]** | **Verify No-Reload State Update** | UI status changes happen instantly without a browser refresh. | | | |
| **[TC-003]** | **Validation - Invalid Format**<br>1. Paste malformed text.<br>2. Click Validate. | UI shows error badge. Submit button disabled. | | | |

### Phase 3: Administrative Controls
*Test Objective: Verify administrative functions working correctly.*

| Test ID | Test Case / Step | Expected Result | Actual Result | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P3-01** | **Admin: Create Tournament** | Tournament created successfully. | | | |
| **Spec 001** | **Admin: Role Management**<br>1. Access `/admin/roles`.<br>2. Change user role. | Role updated successfully. | | | |

## 4. Tester Feedback & Sign-off

### 4.1. Summary of Findings
| Finding ID | Title | Description | Severity (High/Med/Low) |
| :--- | :--- | :--- | :--- |
| | | | |

### 4.2. Overall Assessment
| Criteria | Rating (Green/Yellow/Red) | Comments |
| :--- | :--- | :--- |
| **Functionality** | | |
| **Usability** | | |

### 4.3. UAT Recommendation
[ ] **APPROVE FOR RELEASE**
[ ] **CONDITIONALLY APPROVE**
[ ] **DO NOT APPROVE**

---
**Tester Signature:** _________________________
**Date:** March 17, 2026
