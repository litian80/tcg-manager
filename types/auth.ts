export type Role = 'admin' | 'organizer' | 'user';

export type Permission =
    | 'tom.upload'        // Can upload TOM files
    | 'judge.view_panel'  // Can access Judge Dashboard
    | 'match.edit_result' // Can edit match results manually
    | 'user.manage'       // Can change other users' roles
    | 'profile.view_all'  // Can view other people's detailed profiles
    | 'tournament.manage'; // Can manage tournament settings (publish/unpublish)

export type TournamentAuthorizationResult = {
  isAuthorized: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tournament: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
};
