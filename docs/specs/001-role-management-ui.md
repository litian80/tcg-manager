# Spec 001: Role Management UI

## Context
Currently, assigning roles (`admin`, `organizer`, `judge`) requires manual SQL updates in the Supabase database. This is unscalable and prone to error. We need an administrative dashboard to manage user roles securely.

## Requirements
- **Access Control**: Only users with the `admin` role can access this page.
- **Location**: `/organizer/admin/roles` or a similar dedicated admin route.
- **Features**:
  - Search/List users by email, name, or POP ID.
  - View current assigned roles.
  - Dropdown or toggle mechanism to promote/demote users to specific roles.
  - Audit trail or history of role changes (optional, but recommended for security).

## Technical Implementation Notes
- **Database**: Needs direct updates to the `profiles.role` column. Ensure RLS policies on `profiles` allow admins to `UPDATE` other users.
- **API/Action**: Create a secure server action (e.g., `updateUserRole`) that verifies the caller is an admin before executing.
- **Cache Invalidation**: Role updates must invalidate the target user's profile cache, ensuring they get their new permissions immediately upon next navigation (relates to the middleware cache mechanism).

## Acceptance Criteria
- [ ] Admin can navigate to the Role Management dashboard.
- [ ] Admin can successfully search for a standard user.
- [ ] Admin can upgrade the user to an `organizer`.
- [ ] Non-admin users attempting to access the page are redirected to the homepage with an unauthorized error.
