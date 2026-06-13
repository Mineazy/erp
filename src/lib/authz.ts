export type UserRole = 'admin' | 'accountant' | 'manager' | 'user';

export const ROLES: Record<UserRole, string> = {
  admin: 'Admin',
  accountant: 'Accountant',
  manager: 'Manager',
  user: 'User',
};

export interface PermissionSet {
  admin: boolean;
  accountant: boolean | 'readonly';
  manager: boolean | 'readonly';
  user: boolean | 'readonly';
}

type AccessLevel = boolean | 'readonly';

const MODULE_PERMISSIONS: Record<string, PermissionSet> = {
  financial: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
  },
  inventory: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  crm: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  pos: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: true,
  },
};

function getModuleAccess(module: string, role: UserRole): AccessLevel {
  const perm = MODULE_PERMISSIONS[module];
  if (!perm) return false;
  return perm[role] ?? false;
}

function roleCanWrite(module: string, role: UserRole): boolean {
  return getModuleAccess(module, role) === true;
}

function roleCanRead(module: string, role: UserRole): boolean {
  const access = getModuleAccess(module, role);
  return access === true || access === 'readonly';
}

export function checkApiAccess(
  pathname: string,
  method: string,
  role: string,
): boolean {
  const normalizedRole = role as UserRole;

  const parts = pathname.replace('/api/', '').split('/');
  const module = parts[0];

  if (!module || !MODULE_PERMISSIONS[module]) {
    return true;
  }

  if (method === 'GET') {
    return roleCanRead(module, normalizedRole);
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return roleCanWrite(module, normalizedRole);
  }

  return false;
}

export function canAccessModule(module: string, role: string | undefined): boolean {
  if (!role) return false;
  const access = getModuleAccess(module, role as UserRole);
  return access === true || access === 'readonly';
}

export function canWriteModule(module: string, role: string | undefined): boolean {
  if (!role) return false;
  return roleCanWrite(module, role as UserRole);
}

export function getVisibleModules(role: string | undefined): string[] {
  if (!role) return [];
  return Object.keys(MODULE_PERMISSIONS).filter((mod) =>
    canAccessModule(mod, role),
  );
}
