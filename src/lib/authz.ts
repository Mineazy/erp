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
  messaging: {
    admin: true,
    accountant: true,
    manager: true,
    user: true,
  },
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
  purchasing: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  warehouse: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  workshop: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  fleet: {
    admin: true,
    accountant: true,
    manager: true,
    user: 'readonly',
  },
  tax: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
  },
  fdms: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
  },
  reports: {
    admin: true,
    accountant: true,
    manager: true,
    user: 'readonly',
  },
  admin: {
    admin: true,
    accountant: false,
    manager: false,
    user: false,
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
  department?: string | null,
): boolean {
  const normalizedRole = role as UserRole;

  const parts = pathname.replace('/api/', '').split('/');
  const module = parts[0];

  if (!module || !MODULE_PERMISSIONS[module]) {
    return true;
  }

  if (method === 'GET') {
    return canAccessModule(module, normalizedRole, department);
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return canWriteModule(module, normalizedRole, department);
  }

  return false;
}

export function canAccessModule(module: string, role: string | undefined, department?: string | null): boolean {
  if (!role) return false;

  // Custom overrides for users registered under the Purchasing Department
  if (department && department.toLowerCase() === 'purchasing') {
    const allowedModules = ['purchasing', 'inventory', 'warehouse', 'fleet', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Purchasing department
    if (role !== 'admin') {
      return false;
    }
  }

  // Custom overrides for users registered under the Finance Department
  if (department && (department.toLowerCase() === 'finance' || department.toLowerCase() === 'financial')) {
    const allowedModules = ['financial', 'crm', 'pos', 'fleet', 'fdms', 'reports', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Finance department
    if (role !== 'admin') {
      return false;
    }
  }

  // Custom overrides for users registered under the Business Department
  if (department && department.toLowerCase() === 'business') {
    const allowedModules = ['crm', 'pos', 'workshop', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Business department
    if (role !== 'admin') {
      return false;
    }
  }

  const access = getModuleAccess(module, role as UserRole);
  return access === true || access === 'readonly';
}

export function canWriteModule(module: string, role: string | undefined, department?: string | null): boolean {
  if (!role) return false;

  if (department && department.toLowerCase() === 'purchasing') {
    const allowedModules = ['purchasing', 'inventory', 'warehouse', 'fleet', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  if (department && (department.toLowerCase() === 'finance' || department.toLowerCase() === 'financial')) {
    const allowedModules = ['financial', 'crm', 'pos', 'fleet', 'fdms', 'reports', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  if (department && department.toLowerCase() === 'business') {
    const allowedModules = ['crm', 'pos', 'workshop', 'messaging'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  return roleCanWrite(module, role as UserRole);
}

export function getVisibleModules(role: string | undefined, department?: string | null): string[] {
  if (!role) return [];
  return Object.keys(MODULE_PERMISSIONS).filter((mod) =>
    canAccessModule(mod, role, department),
  );
}
