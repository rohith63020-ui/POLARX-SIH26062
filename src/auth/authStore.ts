/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'LOGISTICS_MANAGER' | 'EXPEDITION_OFFICER' | 'RESEARCHER';

export interface DemoUser {
  id?: string;
  email: string;
  password: string; // Used ONLY for demo verification, NEVER stored in session
  role: UserRole;
  roleTitle: string;
  name: string;
  userId: string;
  station: string;
  clearance: string;
  avatarUrl: string;
  lastLogin: string;
  status: 'ACTIVE';
  allowedRoutes: string[];
  description: string;
}

export interface AuthSession {
  user: Omit<DemoUser, 'password'>;
  token: string;
  loginTime: number;
  expiresAt: number;
  rememberMe: boolean;
  isOfflineSession?: boolean;
}

export const DEMO_USERS: Record<string, DemoUser> = {
  admin: {
    email: 'admin@polarx.demo',
    password: 'Admin@123',
    role: 'ADMIN',
    roleTitle: 'Base Commander & Administrator',
    name: 'Commander V. K. Nair',
    userId: 'USR-POL-001',
    station: 'NCPOR Apex Command / Bharati Base',
    clearance: 'LEVEL-5 FULL COMMAND',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVvwwqO7LzKjWkb_tsB01Idar6LdET96frQKgfejYABheAzVCw0UnRQv8eE--oMeLNOkeCaK_pLX-XDvXaMslpnUIArD0Mnv01l32fI2NwTc5ubYDp8GUauQ2QUR4QuTlJYQo-7ORm_MBsr4c_iQGjcIKmxxWOfDSdKBNEA2aK4GRIApt-K8UMvu2qjP938dGfguL1WN8FhRBHvmZJZZHvnQv89Rl2cxzprbnoG6NeuMBdlrYnpzIZfw',
    lastLogin: 'Today at 08:30 UTC',
    status: 'ACTIVE',
    allowedRoutes: [
      'dashboard',
      'expeditions',
      'cargo',
      'assets',
      'inventory',
      'personnel',
      'ai-insights',
      'emergency',
      'reports',
      'settings',
      'profile',
      'sim',
    ],
    description: 'Supreme operational command across all 3 polar bases with unconstrained authorization.',
  },
  logistics: {
    email: 'logistics@polarx.demo',
    password: 'Logistics@123',
    role: 'LOGISTICS_MANAGER',
    roleTitle: 'Logistics Manager',
    name: 'Rohith Sai',
    userId: 'USR-POL-042',
    station: 'Bharati Station (-69.407°S, 76.184°E)',
    clearance: 'LEVEL-4 TOP SECRET',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDLusVnniIg6lihHt83LC4rr-S6tNtRqkR4fs8ZLIu26nDnVeGOAvY_d980GZZ-mVZIycpwwyLxhr3LGJ28e0qJN8vS2NCl_a4wsVkDWsBgoejD_-PhMuJRQzGXaVZMKFNNkg2xk4oMYSqB8j9E2xkfNMI6QYC_6jaVwxqJXEqx0TkHqa8WeWVxXg77afuffez9dbf75U0sySn0bZX5QC-cHdu8Irymd9QliMki1enQoKhZBQLgb6pykg',
    lastLogin: 'Today at 07:15 UTC',
    status: 'ACTIVE',
    allowedRoutes: [
      'dashboard',
      'expeditions',
      'cargo',
      'assets',
      'inventory',
      'reports',
      'profile',
    ],
    description: 'Oversees continental supply chains, sea-ice fuel resupply, cargo vessels, and inventory buffers.',
  },
  officer: {
    email: 'officer@polarx.demo',
    password: 'Officer@123',
    role: 'EXPEDITION_OFFICER',
    roleTitle: 'Expedition Officer',
    name: 'Maj. Arjun Rathore',
    userId: 'USR-POL-108',
    station: 'Maitri Station (-70.766°S, 11.733°E)',
    clearance: 'LEVEL-3 FIELD TACTICAL',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida/AEtjO1Vf9Xq0xnY47UNhlyZT7Pq9jC1es62slYKE3GsB3emxLWHUYPyinKSKTmWcXE0ZeWU9wN7u-aMXRzh-UC1e1uNDKA5Zu4AvwQhWeXJC_LYmZXqb8I_S61MIwqHjqSEyjhn5ommgosU-s5t7LYm9S8TDkyu07Zkurjg-rbpD0TAwLWwVklCAKG5s3H2G3iLvOcPNy1-LO5iJLhwWje5g3BklQInLGqLk3VJr1FYO1KZEFKUvshfhtlGeCf2u',
    lastLogin: 'Yesterday at 22:40 UTC',
    status: 'ACTIVE',
    allowedRoutes: [
      'dashboard',
      'expeditions',
      'personnel',
      'cargo',
      'assets',
      'emergency',
      'profile',
    ],
    description: 'Leads continental traverse convoys, field personnel safety, SAR rescue sorties, and tactical gear.',
  },
  researcher: {
    email: 'researcher@polarx.demo',
    password: 'Researcher@123',
    role: 'RESEARCHER',
    roleTitle: 'Lead Polar Researcher',
    name: 'Dr. Maya Sen',
    userId: 'USR-POL-219',
    station: 'Himadri Arctic Station (78.924°N, 11.928°E)',
    clearance: 'LEVEL-2 SCIENCE OBSERVER',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDLusVnniIg6lihHt83LC4rr-S6tNtRqkR4fs8ZLIu26nDnVeGOAvY_d980GZZ-mVZIycpwwyLxhr3LGJ28e0qJN8vS2NCl_a4wsVkDWsBgoejD_-PhMuJRQzGXaVZMKFNNkg2xk4oMYSqB8j9E2xkfNMI6QYC_6jaVwxqJXEqx0TkHqa8WeWVxXg77afuffez9dbf75U0sySn0bZX5QC-cHdu8Irymd9QliMki1enQoKhZBQLgb6pykg',
    lastLogin: 'Today at 06:10 UTC',
    status: 'ACTIVE',
    allowedRoutes: [
      'dashboard',
      'expeditions',
      'inventory',
      'ai-insights',
      'reports',
      'profile',
    ],
    description: 'Conducts paleoclimate ice core analysis, atmospheric telemetry sampling, and AI predictive modeling.',
  },
};

const SESSION_STORAGE_KEY = 'polarx_auth_session_v2';

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    // Check if session has expired (8 hours expiry)
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveAuthSession(user: DemoUser, rememberMe: boolean = true): AuthSession {
  const { password: _, ...userSafe } = user;
  const now = Date.now();
  const session: AuthSession = {
    user: userSafe,
    token: `plx_tok_${Math.random().toString(36).substring(2, 12)}_${now}`,
    loginTime: now,
    expiresAt: now + 8 * 60 * 60 * 1000, // 8 hours
    rememberMe,
    isOfflineSession: !navigator.onLine,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to persist auth session to localStorage', e);
  }

  return session;
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth session', e);
  }
}

export function isRouteAllowedForRole(role: UserRole, route: string): boolean {
  const normalizedRoute = route.replace(/^\//, '').toLowerCase();
  // Map aliases
  const routeMap: Record<string, string> = {
    ops: 'dashboard',
    exped: 'expeditions',
    stock: 'inventory',
    ai: 'ai-insights',
    sos: 'emergency',
  };
  const target = routeMap[normalizedRoute] || normalizedRoute;

  // Find demo user for role
  const user = Object.values(DEMO_USERS).find((u) => u.role === role);
  if (!user) return false;
  return user.allowedRoutes.includes(target);
}

export function getAllowedRoutesForRole(role: UserRole): string[] {
  const user = Object.values(DEMO_USERS).find((u) => u.role === role);
  return user ? user.allowedRoutes : ['dashboard'];
}

export function getRoleBadgeColor(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'ADMIN':
      return {
        bg: 'bg-red-100 dark:bg-red-950/60',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-300 dark:border-red-800',
      };
    case 'LOGISTICS_MANAGER':
      return {
        bg: 'bg-blue-100 dark:bg-blue-950/60',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-800',
      };
    case 'EXPEDITION_OFFICER':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-300 dark:border-emerald-800',
      };
    case 'RESEARCHER':
      return {
        bg: 'bg-purple-100 dark:bg-purple-950/60',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-800',
      };
    default:
      return {
        bg: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-700 dark:text-neutral-300',
        border: 'border-neutral-300 dark:border-neutral-700',
      };
  }
}
