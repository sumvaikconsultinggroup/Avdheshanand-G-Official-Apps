/**
 * RBAC — the single source of truth for the whole platform.
 *
 * This file is imported by BOTH the edge middleware and Node API routes, so it
 * must stay pure data + pure functions (no Node built-ins, no DB, no crypto).
 *
 * How enforcement works end to end:
 *   1. A superadmin assigns a role and (optionally) a per-module permission map.
 *   2. Those permissions are stored on the AdminAccess doc AND encoded compactly
 *      into the admin's JWT at signin / token refresh (see `encodePermissions`).
 *   3. `middleware.ts` maps the incoming request path+method to a
 *      { module, action } pair (see `resolveApiPermission`) and allows it only
 *      when the caller's permission map grants that action.
 * So a role is not a label — it is enforced on the server for every request.
 */

// ─── Modules ─────────────────────────────────────────────────────────

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

export const ALL_MODULES: ModuleId[] = [
  'dashboard', 'events', 'donations', 'donationsRecord', 'schedule', 'users',
  'books', 'articles', 'videos', 'podcasts', 'rooms', 'volunteers', 'messages',
  'glimpse', 'imagelibrary', 'printMedia', 'mantraDiksha', 'dailySchedule',
  'livestream', 'tvSchedule', 'dailyVichar', 'chatbot', 'notifications',
  'sevaBoard', 'smartNotes', 'website', 'services',
];

/** Human labels — used by the permission editor UI. */
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

/** Grouping for the permission editor UI. */
export const MODULE_GROUPS: { title: string; modules: ModuleId[] }[] = [
  { title: 'Overview', modules: ['dashboard'] },
  { title: 'Content', modules: ['articles', 'videos', 'podcasts', 'books', 'glimpse', 'printMedia', 'dailyVichar', 'imagelibrary'] },
  { title: 'Programme', modules: ['events', 'schedule', 'dailySchedule', 'tvSchedule', 'livestream'] },
  { title: 'People', modules: ['users', 'volunteers', 'messages', 'mantraDiksha', 'rooms'] },
  { title: 'Giving', modules: ['donations', 'donationsRecord'] },
  { title: 'Operations', modules: ['sevaBoard', 'smartNotes', 'notifications', 'chatbot'] },
  { title: 'Platform', modules: ['website', 'services'] },
];

// ─── Actions ─────────────────────────────────────────────────────────

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export const ALL_ACTION_NAMES: Action[] = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

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

export const ALL_ROLES: RoleName[] = ['superadmin', 'admin', 'editor', 'moderator', 'viewer'];

/** Roles a superadmin may hand out from the team screen (superadmin is not grantable). */
export const ASSIGNABLE_ROLES: RoleName[] = ['admin', 'editor', 'moderator', 'viewer'];

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  superadmin: 100,
  admin: 80,
  editor: 60,
  moderator: 40,
  viewer: 20,
};

export function hasHigherRole(roleA: RoleName, roleB: RoleName): boolean {
  return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
}

export function isRoleName(value: unknown): value is RoleName {
  return typeof value === 'string' && (ALL_ROLES as string[]).includes(value);
}

// ─── Access levels (what the permission editor exposes) ───────────────
//
// The 6 raw actions are powerful but fiddly. The UI presents 4 coherent levels
// per module; each maps onto an exact ModulePermission.

export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

export const ACCESS_LEVELS: { id: AccessLevel; label: string; desc: string }[] = [
  { id: 'none', label: 'No access', desc: 'Hidden entirely' },
  { id: 'view', label: 'View', desc: 'Can look, cannot change' },
  { id: 'edit', label: 'Edit', desc: 'View, add and edit' },
  { id: 'full', label: 'Full', desc: 'Edit, delete, export, approve' },
];

const NONE_PERM: ModulePermission = { view: false, create: false, edit: false, delete: false, export: false, approve: false };
const VIEW_PERM: ModulePermission = { view: true, create: false, edit: false, delete: false, export: false, approve: false };
const EDIT_PERM: ModulePermission = { view: true, create: true, edit: true, delete: false, export: false, approve: false };
const FULL_PERM: ModulePermission = { view: true, create: true, edit: true, delete: true, export: true, approve: true };
/** view + export + approve — a reviewer who changes nothing but signs things off. */
const MODERATE_PERM: ModulePermission = { view: true, create: false, edit: false, delete: false, export: true, approve: true };

export function accessLevelToPermission(level: AccessLevel): ModulePermission {
  switch (level) {
    case 'none': return { ...NONE_PERM };
    case 'view': return { ...VIEW_PERM };
    case 'edit': return { ...EDIT_PERM };
    case 'full': return { ...FULL_PERM };
  }
}

/** Best-fit reverse mapping, so a stored map renders correctly in the editor. */
export function permissionToAccessLevel(perm?: Partial<ModulePermission>): AccessLevel {
  if (!perm || !perm.view) return 'none';
  if (perm.delete || perm.export || perm.approve) return 'full';
  if (perm.create || perm.edit) return 'edit';
  return 'view';
}

// ─── Role templates ──────────────────────────────────────────────────

const CONTENT_MODULES: ModuleId[] = [
  'events', 'books', 'articles', 'videos', 'podcasts',
  'glimpse', 'printMedia', 'dailyVichar', 'tvSchedule', 'dailySchedule', 'imagelibrary',
];

/** Modules a moderator reviews / signs off on. */
const MODERATED_MODULES: ModuleId[] = ['volunteers', 'messages', 'rooms', 'sevaBoard', 'mantraDiksha', 'schedule'];

function buildTemplate(fn: (m: ModuleId) => ModulePermission): PermissionMap {
  const out: PermissionMap = {};
  for (const m of ALL_MODULES) out[m] = fn(m);
  return out;
}

export const ROLE_TEMPLATES: Record<RoleName, PermissionMap> = {
  superadmin: buildTemplate(() => ({ ...FULL_PERM })),

  admin: buildTemplate((m) => (m === 'services' ? { ...VIEW_PERM } : { ...FULL_PERM })),

  editor: buildTemplate((m) => {
    if (CONTENT_MODULES.includes(m)) return { ...EDIT_PERM };
    if (m === 'dashboard') return { ...VIEW_PERM };
    return { ...VIEW_PERM };
  }),

  moderator: buildTemplate((m) => {
    if (MODERATED_MODULES.includes(m)) return { ...MODERATE_PERM };
    return { ...VIEW_PERM };
  }),

  viewer: buildTemplate(() => ({ ...VIEW_PERM })),
};

/** The effective map for an admin: their custom map if set, else their role template. */
export function resolvePermissions(role: RoleName, custom?: PermissionMap | null): PermissionMap {
  if (custom && Object.keys(custom).length > 0) return custom;
  return ROLE_TEMPLATES[role] || ROLE_TEMPLATES.viewer;
}

/** Does this permission map grant ANY of these actions on the module? */
export function can(permissions: PermissionMap, module: ModuleId, actions: Action[]): boolean {
  const perm = permissions[module];
  if (!perm) return false;
  return actions.some((a) => perm[a] === true);
}

// ─── Compact JWT codec ───────────────────────────────────────────────
//
// A full PermissionMap is ~3KB of JSON — too fat for a header-borne JWT once it
// is base64'd. We pack each module's 6 booleans into one integer bitmask, which
// brings the whole claim under ~600 bytes.

const ACTION_BIT: Record<Action, number> = {
  view: 1, create: 2, edit: 4, delete: 8, export: 16, approve: 32,
};

export type CompactPermissions = Record<string, number>;

export function encodePermissions(permissions: PermissionMap): CompactPermissions {
  const out: CompactPermissions = {};
  for (const m of ALL_MODULES) {
    const perm = permissions[m];
    if (!perm) continue;
    let mask = 0;
    for (const a of ALL_ACTION_NAMES) if (perm[a]) mask |= ACTION_BIT[a];
    if (mask) out[m] = mask; // omit zero-masks to save bytes ("no access")
  }
  return out;
}

export function decodePermissions(compact: CompactPermissions | null | undefined): PermissionMap {
  const out: PermissionMap = {};
  if (!compact) return out;
  for (const m of ALL_MODULES) {
    const mask = compact[m];
    const perm: ModulePermission = { ...NONE_PERM };
    if (typeof mask === 'number' && mask > 0) {
      for (const a of ALL_ACTION_NAMES) perm[a] = (mask & ACTION_BIT[a]) !== 0;
    }
    out[m] = perm;
  }
  return out;
}

/**
 * Coerce whatever is on the JWT into a usable map.
 * Supports the new compact `perms` claim, the legacy full `permissions` claim,
 * and falls back to the role template so existing tokens keep working.
 */
export function permissionsFromTokenPayload(payload: {
  role?: unknown;
  perms?: unknown;
  permissions?: unknown;
}): { role: RoleName; permissions: PermissionMap } {
  const rawRole = typeof payload.role === 'string' ? payload.role.toLowerCase() : '';
  const role: RoleName = isRoleName(rawRole) ? rawRole : 'viewer';

  // New compact claim.
  if (payload.perms && typeof payload.perms === 'object') {
    return { role, permissions: decodePermissions(payload.perms as CompactPermissions) };
  }
  // Legacy full claim (tokens minted before this change).
  if (payload.permissions && typeof payload.permissions === 'object'
      && Object.keys(payload.permissions as object).length > 0) {
    return { role, permissions: payload.permissions as PermissionMap };
  }
  return { role, permissions: ROLE_TEMPLATES[role] };
}

/** Strip anything unknown so a client can't smuggle junk modules/actions into Mongo. */
export function sanitizePermissionMap(input: unknown): PermissionMap {
  const out: PermissionMap = {};
  if (!input || typeof input !== 'object') return out;
  const src = input as Record<string, unknown>;
  for (const m of ALL_MODULES) {
    const perm = src[m];
    if (!perm || typeof perm !== 'object') continue;
    const p = perm as Record<string, unknown>;
    out[m] = {
      view: p.view === true,
      create: p.create === true,
      edit: p.edit === true,
      delete: p.delete === true,
      export: p.export === true,
      approve: p.approve === true,
    };
  }
  return out;
}

// ─── API path → module mapping (what the middleware enforces) ─────────

/** Routes only a superadmin may ever touch (role/permission administration). */
export const SUPERADMIN_ONLY_PREFIXES: string[] = [
  '/api/users/permissions',
  '/api/users/all-permissions',
];

/**
 * Every guarded API prefix and the module that governs it.
 * ORDER MATTERS: longest/most-specific prefix must come first.
 */
const API_MODULE_RULES: { prefix: string; module: ModuleId }[] = [
  // More specific /api/notifications/* before any broader rule.
  { prefix: '/api/notifications/send', module: 'notifications' },
  { prefix: '/api/notifications/broadcast', module: 'notifications' },
  { prefix: '/api/notifications/scheduled', module: 'notifications' },
  { prefix: '/api/notifications/admin-task-reminders', module: 'notifications' },
  { prefix: '/api/admin/notification-devices', module: 'notifications' },
  { prefix: '/api/admin/team', module: 'users' },

  { prefix: '/api/users', module: 'users' },
  { prefix: '/api/connect', module: 'messages' },
  { prefix: '/api/sendemail', module: 'messages' },
  { prefix: '/api/images', module: 'imagelibrary' },
  { prefix: '/api/userphotos', module: 'imagelibrary' },
  { prefix: '/api/scheduleRegistration', module: 'schedule' },
  { prefix: '/api/donationsRecord', module: 'donationsRecord' },
  { prefix: '/api/donations', module: 'donations' },
  { prefix: '/api/donate', module: 'donations' },
  { prefix: '/api/volunteer', module: 'volunteers' },
  { prefix: '/api/mantra-diksha', module: 'mantraDiksha' },
  { prefix: '/api/seva-tasks', module: 'sevaBoard' },
  { prefix: '/api/smart-notes', module: 'smartNotes' },

  { prefix: '/api/events', module: 'events' },
  { prefix: '/api/daily-events', module: 'dailySchedule' },
  { prefix: '/api/schedule', module: 'schedule' },
  { prefix: '/api/articles', module: 'articles' },
  { prefix: '/api/podcasts', module: 'podcasts' },
  { prefix: '/api/videoseries', module: 'videos' },
  { prefix: '/api/allbooks', module: 'books' },
  { prefix: '/api/glimpse', module: 'glimpse' },
  { prefix: '/api/printmedia', module: 'printMedia' },
  { prefix: '/api/livestream', module: 'livestream' },
  { prefix: '/api/tv-schedule', module: 'tvSchedule' },
  { prefix: '/api/daily-vichar', module: 'dailyVichar' },
  { prefix: '/api/bookedroom', module: 'rooms' },
  { prefix: '/api/roombooking', module: 'rooms' },
  { prefix: '/api/chat-bot', module: 'chatbot' },
];

/**
 * Prefixes whose GET is PUBLIC (the devotee app reads them) — only mutations are
 * gated. Everything else in API_MODULE_RULES is gated on every method.
 */
const PUBLIC_READ_PREFIXES = new Set<string>([
  '/api/donate', '/api/events', '/api/schedule', '/api/articles', '/api/podcasts',
  '/api/videoseries', '/api/allbooks', '/api/glimpse', '/api/printmedia',
  '/api/livestream', '/api/tv-schedule', '/api/daily-vichar', '/api/daily-events',
  '/api/bookedroom', '/api/roombooking', '/api/chat-bot',
]);

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?');
}

export function isSuperadminOnlyPath(pathname: string): boolean {
  return SUPERADMIN_ONLY_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/**
 * What permission does this request need?
 * Returns null when the path is not a guarded module route (middleware then
 * falls back to "any authenticated admin", preserving today's behaviour for
 * anything not explicitly mapped).
 *
 * `anyOf` semantics: the caller needs AT LEAST ONE of these actions. That is how
 * a Moderator (approve = true, edit = false) can still approve a volunteer while
 * being unable to edit content.
 */
export function resolveApiPermission(
  pathname: string,
  method: string
): { module: ModuleId; anyOf: Action[] } | null {
  const rule = API_MODULE_RULES.find((r) => matchesPrefix(pathname, r.prefix));
  if (!rule) return null;

  const m = method.toUpperCase();
  const isRead = m === 'GET' || m === 'HEAD';

  // Public-read modules: reads are open, only writes are gated.
  if (isRead && PUBLIC_READ_PREFIXES.has(rule.prefix)) return null;

  if (isRead) return { module: rule.module, anyOf: ['view'] };
  if (m === 'POST') return { module: rule.module, anyOf: ['create'] };
  if (m === 'DELETE') return { module: rule.module, anyOf: ['delete'] };

  // PUT / PATCH — on reviewable modules, `approve` also unlocks it.
  if (MODERATED_MODULES.includes(rule.module)) {
    return { module: rule.module, anyOf: ['edit', 'approve'] };
  }
  return { module: rule.module, anyOf: ['edit'] };
}
