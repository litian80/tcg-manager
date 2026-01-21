export type Role = 'admin' | 'organizer' | 'judge' | 'user';

export type Permission =
    | 'tom.upload'        // Can upload TOM files
    | 'judge.view_panel'  // Can access Judge Dashboard
    | 'match.edit_result' // Can edit match results manually
    | 'user.manage'       // Can change other users' roles
    | 'profile.view_all'  // Can view other people's detailed profiles
    | 'tournament.manage'; // Can manage tournament settings (publish/unpublish)

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    admin: ['tom.upload', 'judge.view_panel', 'match.edit_result', 'user.manage', 'profile.view_all', 'tournament.manage'],
    organizer: ['tom.upload', 'judge.view_panel', 'match.edit_result'],
    judge: ['judge.view_panel', 'match.edit_result'],
    user: []
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
}
