export type UserRole = 'admin' | 'accountant' | 'manager' | 'user' | 'fuel_attendant';

export const ROLES: Record<UserRole, string> = {
  admin: 'Admin',
  accountant: 'Accountant',
  manager: 'Manager',
  user: 'User',
  fuel_attendant: 'Fuel Attendant',
};

const USER_DEFAULT_MODULES = ['documents', 'messaging'];

export interface PermissionSet {
  admin: boolean;
  accountant: boolean | 'readonly';
  manager: boolean | 'readonly';
  user: boolean | 'readonly';
  fuel_attendant: boolean | 'readonly';
}

type AccessLevel = boolean | 'readonly';

const MODULE_PERMISSIONS: Record<string, PermissionSet> = {
  main: {
    admin: true,
    accountant: false,
    manager: false,
    user: false,
    fuel_attendant: false,
  },
  messaging: {
    admin: true,
    accountant: true,
    manager: true,
    user: true,
    fuel_attendant: false,
  },
  financial: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
    fuel_attendant: false,
  },
  inventory: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  crm: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  pos: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: true,
    fuel_attendant: false,
  },
  purchasing: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  warehouse: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  workshop: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  fleet: {
    admin: true,
    accountant: true,
    manager: true,
    user: 'readonly',
    fuel_attendant: true,
  },
  tax: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
    fuel_attendant: false,
  },
  fdms: {
    admin: true,
    accountant: true,
    manager: 'readonly',
    user: false,
    fuel_attendant: false,
  },
  reports: {
    admin: true,
    accountant: true,
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  sales: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  admin: {
    admin: true,
    accountant: false,
    manager: false,
    user: false,
    fuel_attendant: false,
  },
  projects: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  documents: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
  },
  hr: {
    admin: true,
    accountant: 'readonly',
    manager: true,
    user: 'readonly',
    fuel_attendant: false,
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

  // Fuel attendant: locked to fleet module only, no exceptions
  if (role === 'fuel_attendant') {
    return module.toLowerCase() === 'fleet';
  }

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

  // User role: default access restricted to documents + messaging only
  // Other modules require explicit permissions.modules assignment
  if (role === 'user') {
    return USER_DEFAULT_MODULES.includes(module.toLowerCase());
  }

  const access = getModuleAccess(module, role as UserRole);
  return access === true || access === 'readonly';
}

export function canWriteModule(module: string, role: string | undefined, department?: string | null, permissions?: any | null): boolean {
  if (!role) return false;

  // Fuel attendant: locked to fleet module only, no exceptions
  if (role === 'fuel_attendant') {
    return module.toLowerCase() === 'fleet';
  }

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

  // User role: write access restricted to documents + messaging only
  if (role === 'user') {
    return USER_DEFAULT_MODULES.includes(module.toLowerCase());
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

  // Fuel attendant: only /fleet/attendant page, no exceptions
  if (role === 'fuel_attendant') {
    return href === '/fleet/attendant';
  }

  // If permissions.menus is set and non-empty, restrict to those specific items
  if (permissions?.menus && Array.isArray(permissions.menus) && permissions.menus.length > 0) {
    return permissions.menus.includes(href);
  }

  // If no explicit menus restriction, fall back to module-level access
  const mod = href.split('/')[1]; 
  return canAccessModule(mod, role, department);
}
