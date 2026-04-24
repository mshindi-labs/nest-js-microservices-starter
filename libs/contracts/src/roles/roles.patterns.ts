export const ROLES_PATTERNS = {
  CREATE: 'roles.create',
  FIND_ALL: 'roles.findAll',
  FIND_BY_ID: 'roles.findById',
  UPDATE: 'roles.update',
  DELETE: 'roles.delete',
} as const;

export type RolesPattern = (typeof ROLES_PATTERNS)[keyof typeof ROLES_PATTERNS];
