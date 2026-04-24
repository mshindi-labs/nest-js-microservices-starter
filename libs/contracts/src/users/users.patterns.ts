export const USERS_PATTERNS = {
  FIND_ALL: 'users.findAll',
  FIND_BY_ID: 'users.findById',
  PROFILE_STATUS: 'users.profileStatus',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  DELETE: 'users.delete',
} as const;

export type UsersPattern = (typeof USERS_PATTERNS)[keyof typeof USERS_PATTERNS];
