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
  main: {
    admin: true,
    accountant: false,
    manager: false,
    user: false,
  },
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
  sales: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  admin: {
    admin: true,
    accountant: false,
    manager: false,
    user: false,
  },
  projects: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
  },
  documents: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
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
  permissions?: any | null,
): boolean {
  const normalizedRole = role as UserRole;

  const parts = pathname.replace('/api/', '').split('/');
  const module = parts[0];

  if (!module || !MODULE_PERMISSIONS[module]) {
    return true;
  }

  if (method === 'GET') {
    return canAccessModule(module, normalizedRole, department, permissions);
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return canWriteModule(module, normalizedRole, department, permissions);
  }

  return false;
}

export function canAccessModule(module: string, role: string | undefined, department?: string | null, permissions?: any | null): boolean {
  if (!role) return false;

  if (permissions?.modules) {
    return permissions.modules.includes(module.toLowerCase());
  }

  // Custom overrides for users registered under the Purchasing Department
  if (department && department.toLowerCase() === 'purchasing') {
    const allowedModules = ['purchasing', 'inventory', 'warehouse', 'fleet', 'messaging', 'documents', 'dashboard'];
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
    const allowedModules = ['financial', 'crm', 'pos', 'fleet', 'fdms', 'reports', 'messaging', 'sales', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Finance department
    if (role !== 'admin') {
      return false;
    }
  }

  // Custom overrides for users registered under the Business Development Department
  if (department && (department.toLowerCase() === 'business' || department.toLowerCase() === 'business development')) {
    const allowedModules = ['crm', 'pos', 'workshop', 'messaging', 'sales', 'projects', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Business Development department
    if (role !== 'admin') {
      return false;
    }
  }

  // Custom overrides for users registered under the Warehouse Department
  if (department && (department.toLowerCase() === 'warehouse' || department.toLowerCase() === 'inventory')) {
    const allowedModules = ['inventory', 'warehouse', 'messaging', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
    // Block non-admin users from accessing other modules if in the Warehouse department
    if (role !== 'admin') {
      return false;
    }
  }

  const access = getModuleAccess(module, role as UserRole);
  return access === true || access === 'readonly';
}

export function canWriteModule(module: string, role: string | undefined, department?: string | null, permissions?: any | null): boolean {
  if (!role) return false;

  if (permissions?.modules) {
    return permissions.modules.includes(module.toLowerCase());
  }

  if (department && department.toLowerCase() === 'purchasing') {
    const allowedModules = ['purchasing', 'inventory', 'warehouse', 'fleet', 'messaging', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  if (department && (department.toLowerCase() === 'finance' || department.toLowerCase() === 'financial')) {
    const allowedModules = ['financial', 'crm', 'pos', 'fleet', 'fdms', 'reports', 'messaging', 'sales', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  if (department && (department.toLowerCase() === 'business' || department.toLowerCase() === 'business development')) {
    const allowedModules = ['crm', 'pos', 'workshop', 'messaging', 'sales', 'projects', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  if (department && (department.toLowerCase() === 'warehouse' || department.toLowerCase() === 'inventory')) {
    const allowedModules = ['inventory', 'warehouse', 'messaging', 'documents', 'dashboard'];
    if (allowedModules.includes(module.toLowerCase())) {
      return true;
    }
  }

  return roleCanWrite(module, role as UserRole);
}

export function getVisibleModules(role: string | undefined, department?: string | null, permissions?: any | null): string[] {
  if (!role) return [];
  return Object.keys(MODULE_PERMISSIONS).filter((mod) =>
    canAccessModule(mod, role, department, permissions),
  );
}

export function canAccessMenu(href: string, permissions: any | null, role: string | undefined, department?: string | null): boolean {
  if (!role) return false;

  // Exact menu match
  if (permissions?.menus) {
    if (permissions.menus.includes(href)) return true;
    
    // Allow if parent path is permitted? For now require exact match since admin explicitly selects
    // But they might only select the module, in which case do we allow all menus?
    // Let's rely strictly on the `menus` array if `permissions` is defined.
    // If the admin only checks the module but no menus, they get no menus.
    return false;
  }

  // If no explicit permissions set, fallback to whether they can access the module at all
  // The module needs to be extracted from the href, e.g. /inventory/dashboard -> inventory
  const mod = href.split('/')[1]; 
  return canAccessModule(mod, role, department);
}
