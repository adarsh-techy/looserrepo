import { User } from '../types';

export interface AppPageDef {
  key: string;
  path: string;
  label: string;
  category: 'Workspace' | 'Finance & Accounts' | 'Communication' | 'Security & Vault' | 'System & Audit';
  description: string;
  adminOnly?: boolean;
}

export const APP_PAGES: AppPageDef[] = [
  // 1. Workspace
  {
    key: 'works',
    path: '/works',
    label: 'Works',
    category: 'Workspace',
    description: 'Client projects, credentials vault & tech architecture',
  },
  {
    key: 'day-to-day',
    path: '/day-to-day',
    label: 'Day to Day',
    category: 'Workspace',
    description: 'Daily logs, tasks calendar & activity planner',
  },
  {
    key: 'future-plans',
    path: '/future-plans',
    label: 'Future Plans',
    category: 'Workspace',
    description: 'Roadmaps, milestones & dual-partner collaboration',
  },
  {
    key: 'business',
    path: '/business',
    label: 'Business',
    category: 'Workspace',
    description: 'Business ideas, revenue models & core assets',
  },
  {
    key: 'health',
    path: '/health',
    label: 'Adarsh Family Health',
    category: 'Workspace',
    description: 'Adarsh family personal medical records, diagnostics & physician consultations',
    adminOnly: true,
  },

  // 2. Finance & Accounts
  {
    key: 'money-management',
    path: '/money-management',
    label: 'Money Management',
    category: 'Finance & Accounts',
    description: 'Daily cashflow, GPay/Cash tracker, weekly breakdowns & instant entries',
  },
  {
    key: 'payments',
    path: '/payments',
    label: 'Payments & ITR',
    category: 'Finance & Accounts',
    description: 'Monthly ledger, attached tax invoices & ITR statement downloads',
  },

  // 3. Communication & Notices
  {
    key: 'reminders-notes',
    path: '/reminders-notes',
    label: 'Reminders & Notes',
    category: 'Communication',
    description: 'Shared priority notices & acknowledgments',
  },
  {
    key: 'notifications',
    path: '/notifications',
    label: 'Notifications',
    category: 'Communication',
    description: 'Platform & database renewal alerts & activity alerts',
  },

  // 4. Security & Vault
  {
    key: 'passwords',
    path: '/passwords',
    label: 'Passwords Vault',
    category: 'Security & Vault',
    description: 'AES-256 encrypted credential password store',
  },
  {
    key: 'documents',
    path: '/documents',
    label: 'Documents & Cards',
    category: 'Security & Vault',
    description: 'Bank accounts, ATM/Debit cards, Government IDs (License, Aadhaar, PAN, Passport, Voter ID) & Health Insurance',
  },
  {
    key: 'secret-notes',
    path: '/secret-notes',
    label: 'Secret Notes',
    category: 'Security & Vault',
    description: 'Emergency inactivity directives & siren access protocol',
  },
  {
    key: 'my-secret-notes',
    path: '/my-secret-notes',
    label: 'My Secret Notes',
    category: 'Security & Vault',
    description: 'Create & manage encrypted directives for partner',
  },

  // 5. System & Audit
  {
    key: 'trash',
    path: '/trash',
    label: 'Recycle Bin & Trash',
    category: 'System & Audit',
    description: 'Deleted records archive, inspection & instant restoration',
  },
  {
    key: 'audit-log',
    path: '/audit-log',
    label: 'Audit Log',
    category: 'System & Audit',
    description: 'Immutable security telemetry & tamper-evident logs',
  },
  {
    key: 'users',
    path: '/users',
    label: 'Users & Access',
    category: 'System & Audit',
    description: 'User accounts & page permissions control',
    adminOnly: true,
  },
];



export function hasPageAccess(
  user: User | { role?: string; pagePermissions?: string[] } | null | undefined,
  pagePath: string
): boolean {
  if (!user) return false;

  // Role AD has unconditional access to ALL pages
  if (user.role === 'AD') return true;

  // Wildcard permission access
  if (user.pagePermissions?.includes('*')) return true;

  const normalized = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const baseRoute = `/${normalized.split('/')[1]}`;

  // /users and /health are strictly restricted to Adarsh (AD) and his family — NOT for NS
  if (baseRoute === '/users' || baseRoute === '/health') {
    return user.role === 'AD';
  }

  const matched = APP_PAGES.find(
    (p) => p.path === normalized || `/${p.key}` === normalized || p.path === baseRoute
  );
  if (!matched) return true;

  return (
    (user.pagePermissions?.includes(matched.path) ||
      user.pagePermissions?.includes(matched.key)) ??
    false
  );
}

export function getDefaultAccessibleRoute(user: User | null | undefined): string {
  if (!user) return '/login';
  if (user.role === 'AD') return '/works';

  for (const page of APP_PAGES) {
    if (!page.adminOnly && hasPageAccess(user, page.path)) {
      return page.path;
    }
  }

  return '/works';
}
