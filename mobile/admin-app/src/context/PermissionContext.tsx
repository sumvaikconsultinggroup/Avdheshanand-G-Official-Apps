/**
 * RBAC Permission System for Admin Mobile App
 * Enterprise-grade role-based access control.
 * 
 * Roles: superadmin > admin > editor > moderator > viewer
 * Each role has granular permissions per module.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import api from '../services/api';

/** Must match the key AuthContext writes the JWT to. */
const TOKEN_KEY = 'admin_auth_token';

// ─── Permission Types ────────────────────────────────────────────────

export type ModuleId =
  | 'dashboard'
  | 'events'
  | 'donations'
  | 'donationsRecord'
  | 'schedule'
  | 'users'
  | 'books'
  | 'articles'
  | 'videos'
  | 'podcasts'
  | 'rooms'
  | 'volunteers'
  | 'messages'
  | 'glimpse'
  | 'imagelibrary'
  | 'printMedia'
  | 'mantraDiksha'
  | 'dailySchedule'
  | 'livestream'
  | 'tvSchedule'
  | 'dailyVichar'
  | 'chatbot'
  | 'notifications'
  | 'sevaBoard'
  | 'smartNotes'
  | 'website'
  | 'services';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  approve: boolean;
}

export type PermissionMap = Partial<Record<ModuleId, Partial<ModulePermission>>>;

export type RoleName = 'superadmin' | 'admin' | 'editor' | 'moderator' | 'viewer';

// ─── Default Role Templates ──────────────────────────────────────────

const ALL_ACTIONS: ModulePermission = {
  view: true, create: true, edit: true, delete: true, export: true, approve: true,
};

const VIEW_ONLY: ModulePermission = {
  view: true, create: false, edit: false, delete: false, export: false, approve: false,
};

const CONTENT_EDIT: ModulePermission = {
  view: true, create: true, edit: true, delete: false, export: false, approve: false,
};

const MODERATE: ModulePermission = {
  view: true, create: false, edit: false, delete: false, export: true, approve: true,
};

const ALL_MODULES: ModuleId[] = [
  'dashboard', 'events', 'donations', 'donationsRecord', 'schedule', 'users',
  'books', 'articles', 'videos', 'podcasts', 'rooms', 'volunteers', 'messages',
  'glimpse', 'imagelibrary', 'printMedia', 'mantraDiksha', 'dailySchedule',
  'livestream', 'tvSchedule', 'dailyVichar', 'chatbot', 'notifications', 'sevaBoard', 'smartNotes', 'website', 'services',
];

const CONTENT_MODULES: ModuleId[] = [
  'events', 'books', 'articles', 'videos', 'podcasts',
  'glimpse', 'printMedia', 'dailyVichar', 'tvSchedule', 'dailySchedule',
];

export const ROLE_TEMPLATES: Record<RoleName, PermissionMap> = {
  superadmin: Object.fromEntries(ALL_MODULES.map(m => [m, { ...ALL_ACTIONS }])) as PermissionMap,

  admin: Object.fromEntries(
    ALL_MODULES.map(m => [m, m === 'services' ? { ...VIEW_ONLY } : { ...ALL_ACTIONS }])
  ) as PermissionMap,

  editor: Object.fromEntries(
    ALL_MODULES.map(m => {
      if (m === 'dashboard') return [m, { ...VIEW_ONLY }];
      if (CONTENT_MODULES.includes(m)) return [m, { ...CONTENT_EDIT }];
      return [m, { ...VIEW_ONLY }];
    })
  ) as PermissionMap,

  moderator: Object.fromEntries(
    ALL_MODULES.map(m => {
      if (['volunteers', 'messages', 'rooms', 'sevaBoard', 'mantraDiksha'].includes(m)) return [m, { ...MODERATE }];
      if (m === 'dashboard') return [m, { ...VIEW_ONLY }];
      return [m, { ...VIEW_ONLY }];
    })
  ) as PermissionMap,

  viewer: Object.fromEntries(
    ALL_MODULES.map(m => [m, { ...VIEW_ONLY }])
  ) as PermissionMap,
};

// ─── Module + role metadata (drives the permission editor UI) ────────
// Keep in sync with dashboard-next/src/lib/permissions.ts — the server enforces
// the same shape, so a drift here only ever shows a wrong LABEL, never grants
// access the backend would refuse.

export const ALL_MODULE_IDS: ModuleId[] = ALL_MODULES;

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  events: 'Events',
  donations: 'Donations',
  donationsRecord: 'Donation Records',
  schedule: 'Schedule',
  users: 'Team & Users',
  books: 'Books',
  articles: 'Articles',
  videos: 'Videos',
  podcasts: 'Podcasts',
  rooms: 'Room Booking',
  volunteers: 'Volunteers',
  messages: 'Prayer Inbox',
  glimpse: 'Glimpses',
  imagelibrary: 'Image Library',
  printMedia: 'Print Media',
  mantraDiksha: 'Mantra Diksha',
  dailySchedule: 'Daily Schedule',
  livestream: 'Livestream',
  tvSchedule: 'TV Schedule',
  dailyVichar: 'Daily Vichar',
  chatbot: 'Chatbot',
  notifications: 'Notifications',
  sevaBoard: 'Seva Board',
  smartNotes: 'Smart Notes',
  website: 'Website',
  services: 'Services',
};

export const MODULE_GROUPS: { title: string; modules: ModuleId[] }[] = [
  { title: 'Overview', modules: ['dashboard'] },
  { title: 'Content', modules: ['articles', 'videos', 'podcasts', 'books', 'glimpse', 'printMedia', 'dailyVichar', 'imagelibrary'] },
  { title: 'Programme', modules: ['events', 'schedule', 'dailySchedule', 'tvSchedule', 'livestream'] },
  { title: 'People', modules: ['users', 'volunteers', 'messages', 'mantraDiksha', 'rooms'] },
  { title: 'Giving', modules: ['donations', 'donationsRecord'] },
  { title: 'Operations', modules: ['sevaBoard', 'smartNotes', 'notifications', 'chatbot'] },
  { title: 'Platform', modules: ['website', 'services'] },
];

/** Roles a superadmin can hand out (superadmin itself is not grantable here). */
export const ASSIGNABLE_ROLES: RoleName[] = ['admin', 'editor', 'moderator', 'viewer'];

export const ROLE_LABELS: Record<RoleName, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  superadmin: 'Full access to every module, plus team and permission management.',
  admin: 'Manage all modules. Cannot manage the team or permissions.',
  editor: 'Create and edit content. Cannot delete, export or approve.',
  moderator: 'Review, approve and export incoming requests. Edits nothing.',
  viewer: 'Read-only access. Can look, but cannot change anything.',
};

/**
 * The 6 raw actions are fiddly, so the editor exposes 4 coherent levels per
 * module. Each maps to an exact ModulePermission the server understands.
 */
export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

export const ACCESS_LEVELS: { id: AccessLevel; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Hidden entirely' },
  { id: 'view', label: 'View', desc: 'Can look, cannot change' },
  { id: 'edit', label: 'Edit', desc: 'View, add and edit' },
  { id: 'full', label: 'Full', desc: 'Edit, delete, export, approve' },
];

export function accessLevelToPermission(level: AccessLevel): ModulePermission {
  switch (level) {
    case 'none': return { view: false, create: false, edit: false, delete: false, export: false, approve: false };
    case 'view': return { view: true, create: false, edit: false, delete: false, export: false, approve: false };
    case 'edit': return { view: true, create: true, edit: true, delete: false, export: false, approve: false };
    case 'full': return { view: true, create: true, edit: true, delete: true, export: true, approve: true };
  }
}

export function permissionToAccessLevel(perm?: Partial<ModulePermission>): AccessLevel {
  if (!perm || !perm.view) return 'none';
  if (perm.delete || perm.export || perm.approve) return 'full';
  if (perm.create || perm.edit) return 'edit';
  return 'view';
}

/** Turn a whole permission map into the editor's per-module level view. */
export function mapToAccessLevels(map: PermissionMap): Record<ModuleId, AccessLevel> {
  const out = {} as Record<ModuleId, AccessLevel>;
  for (const m of ALL_MODULES) out[m] = permissionToAccessLevel(map[m]);
  return out;
}

/** ...and back into the PermissionMap the API stores. */
export function accessLevelsToMap(levels: Record<ModuleId, AccessLevel>): PermissionMap {
  const out: PermissionMap = {};
  for (const m of ALL_MODULES) out[m] = accessLevelToPermission(levels[m] || 'none');
  return out;
}

/** How many modules this person can actually see — shown as a summary chip. */
export function countVisibleModules(map: PermissionMap): number {
  return ALL_MODULES.filter((m) => map[m]?.view === true).length;
}

// ─── Permission Context ──────────────────────────────────────────────

interface PermissionContextType {
  permissions: PermissionMap;
  role: RoleName;
  isLoading: boolean;
  can: (module: ModuleId, action: Action) => boolean;
  canAny: (module: ModuleId, actions: Action[]) => boolean;
  canAll: (module: ModuleId, actions: Action[]) => boolean;
  canAccessModule: (module: ModuleId) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { admin, isAuthenticated, logout } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [role, setRole] = useState<RoleName>('viewer');
  const [isLoading, setIsLoading] = useState(true);

  const resolvePermissions = useCallback(async () => {
    if (!isAuthenticated || !admin) {
      setPermissions(ROLE_TEMPLATES.viewer);
      setRole('viewer');
      setIsLoading(false);
      return;
    }

    try {
      // `/admin/me` returns THIS admin's effective role + permissions straight
      // from the database, and is open to every authenticated admin.
      // (The old call hit the superadmin-only /users/all-permissions, so every
      // non-superadmin 403'd and silently fell back to admin-level access.)
      const response = await api.get('/admin/me');
      const serverRole = response.data?.role as RoleName | undefined;
      const serverPerms = response.data?.permissions as PermissionMap | undefined;
      const freshToken = response.data?.token as string | undefined;

      // The server re-mints a token carrying the CURRENT permission map. Swapping
      // it in is what makes a superadmin's change take effect right away instead
      // of waiting for the old 24h token to expire.
      if (freshToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, freshToken).catch(() => {});
      }

      const roleKey: RoleName =
        serverRole && serverRole in ROLE_TEMPLATES ? serverRole : 'viewer';

      setRole(roleKey);
      setPermissions(
        serverPerms && Object.keys(serverPerms).length > 0
          ? serverPerms
          : ROLE_TEMPLATES[roleKey]
      );
    } catch (err: any) {
      // Deactivated mid-session — the server says so; drop the session.
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        setPermissions(ROLE_TEMPLATES.viewer);
        setRole('viewer');
        setIsLoading(false);
        logout?.();
        return;
      }
      // Offline / transient failure — fall back to the LAST KNOWN role's template.
      // Defaults to `viewer` (least privilege), never `admin`, so a network blip
      // can never hand someone more access than they have.
      const roleKey: RoleName =
        admin.role && (admin.role as RoleName) in ROLE_TEMPLATES
          ? (admin.role as RoleName)
          : 'viewer';
      setPermissions(ROLE_TEMPLATES[roleKey]);
      setRole(roleKey);
    } finally {
      setIsLoading(false);
    }
  }, [admin, isAuthenticated, logout]);

  useEffect(() => {
    resolvePermissions();
  }, [resolvePermissions]);

  const can = useCallback(
    (module: ModuleId, action: Action): boolean => {
      if (role === 'superadmin') return true;
      const modulePerms = permissions[module];
      if (!modulePerms) return false;
      return modulePerms[action] === true;
    },
    [permissions, role]
  );

  const canAny = useCallback(
    (module: ModuleId, actions: Action[]): boolean => {
      return actions.some(action => can(module, action));
    },
    [can]
  );

  const canAll = useCallback(
    (module: ModuleId, actions: Action[]): boolean => {
      return actions.every(action => can(module, action));
    },
    [can]
  );

  const canAccessModule = useCallback(
    (module: ModuleId): boolean => can(module, 'view'),
    [can]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        role,
        isLoading,
        can,
        canAny,
        canAll,
        canAccessModule,
        refreshPermissions: resolvePermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissions must be used within PermissionProvider');
  return context;
}
