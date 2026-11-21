import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthStatusResponse, AuthUser, UserRole } from '../types/clinic.ts';
import {
  deleteStoredUser,
  findStoredUserByUsername,
  listStoredUsers,
  upsertStoredUser,
} from './store.ts';

const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface TokenPayload {
  sub: string;
  username: string;
  displayName: string;
  role: UserRole;
  source: 'env' | 'store';
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function safeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signAuthToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    source: user.source ?? 'store',
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest();
  return `${encodedPayload}.${base64UrlEncode(sig)}`;
}

export function verifyAuthToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSig] = parts;
  if (!encodedPayload || !encodedSig) return null;

  try {
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest(),
    );
    if (!safeCompareStrings(encodedSig, expectedSig)) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<TokenPayload>;
    if (
      !payload.sub ||
      !payload.username ||
      !payload.displayName ||
      (payload.role !== 'admin' && payload.role !== 'staff') ||
      typeof payload.exp !== 'number' ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
      source: payload.source === 'env' ? 'env' : 'store',
    };
  } catch {
    return null;
  }
}

function getEnvAdminConfig(): { username: string; password: string } | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  const username = (process.env.ADMIN_USERNAME?.trim() || 'admin').toLowerCase();
  return { username, password };
}

function getEnvStaffConfig(): { username: string; password: string } | null {
  const password = process.env.STAFF_PASSWORD?.trim();
  if (!password) return null;
  const username = (process.env.STAFF_USERNAME?.trim() || 'staff').toLowerCase();
  return { username, password };
}

export function getAuthStatus(): AuthStatusResponse {
  const envAdminConfigured = Boolean(getEnvAdminConfig());
  const envStaffConfigured = Boolean(getEnvStaffConfig());
  const stored = listStoredUsers();
  const adminConfigured = envAdminConfigured || stored.some((u) => u.role === 'admin');
  const staffConfigured = envStaffConfigured || stored.some((u) => u.role === 'staff');

  return {
    adminConfigured,
    staffConfigured,
    envAdminConfigured,
    envStaffConfigured,
  };
}

export function setupInitialCredentials(input: {
  adminUsername: string;
  adminDisplayName?: string;
  adminPassword: string;
  staffUsername?: string;
  staffDisplayName?: string;
  staffPassword?: string;
}): { ok: true; user: AuthUser } | { ok: false; status: number; error: string } {
  const status = getAuthStatus();
  if (status.adminConfigured) {
    return {
      ok: false,
      status: 403,
      error: 'Clinic portal accounts are already configured. Please sign in.',
    };
  }

  const adminUsername = input.adminUsername.trim().toLowerCase();
  const adminPassword = input.adminPassword;
  if (!adminUsername || adminUsername.length < 3) {
    return { ok: false, status: 400, error: 'Admin username must be at least 3 characters.' };
  }
  if (!adminPassword || adminPassword.length < 6) {
    return { ok: false, status: 400, error: 'Admin password must be at least 6 characters.' };
  }

  const adminUser = upsertStoredUser({
    username: adminUsername,
    displayName: input.adminDisplayName?.trim() || 'Clinic Admin',
    role: 'admin',
    passwordHash: hashPassword(adminPassword),
  });

  if (input.staffPassword && input.staffPassword.length > 0) {
    const staffUsername = (input.staffUsername?.trim() || 'staff').toLowerCase();
    if (staffUsername === adminUsername) {
      return {
        ok: false,
        status: 400,
        error: 'Staff username must be different from Admin username.',
      };
    }
    if (input.staffPassword.length < 6) {
      return {
        ok: false,
        status: 400,
        error: 'Staff password must be at least 6 characters.',
      };
    }
    upsertStoredUser({
      username: staffUsername,
      displayName: input.staffDisplayName?.trim() || 'Front Desk Staff',
      role: 'staff',
      passwordHash: hashPassword(input.staffPassword),
    });
  }

  return {
    ok: true,
    user: {
      id: adminUser.id,
      username: adminUser.username,
      displayName: adminUser.displayName,
      role: adminUser.role,
      source: 'store',
      createdAt: adminUser.createdAt,
    },
  };
}

export function authenticateUser(input: {
  username: string;
  password: string;
  expectedRole?: UserRole;
}): { ok: true; user: AuthUser } | { ok: false; status: number; error: string } {
  const username = input.username.trim().toLowerCase();
  const password = input.password;

  if (!username || !password) {
    return { ok: false, status: 400, error: 'Username and password are required.' };
  }

  const envAdmin = getEnvAdminConfig();
  if (envAdmin && username === envAdmin.username) {
    if (!safeCompareStrings(password, envAdmin.password)) {
      return { ok: false, status: 401, error: 'Invalid username or password.' };
    }
    if (input.expectedRole && input.expectedRole !== 'admin') {
      return {
        ok: false,
        status: 403,
        error: 'This is an Admin account. Please select Admin Login.',
      };
    }
    return {
      ok: true,
      user: {
        id: 'env-admin',
        username: envAdmin.username,
        displayName: 'Clinic Admin',
        role: 'admin',
        source: 'env',
      },
    };
  }

  const envStaff = getEnvStaffConfig();
  if (envStaff && username === envStaff.username) {
    if (!safeCompareStrings(password, envStaff.password)) {
      return { ok: false, status: 401, error: 'Invalid username or password.' };
    }
    if (input.expectedRole && input.expectedRole !== 'staff') {
      return {
        ok: false,
        status: 403,
        error: 'This is a Staff account. Please select Staff Login.',
      };
    }
    return {
      ok: true,
      user: {
        id: 'env-staff',
        username: envStaff.username,
        displayName: 'Front Desk Staff',
        role: 'staff',
        source: 'env',
      },
    };
  }

  const stored = findStoredUserByUsername(username);
  if (!stored || !verifyPasswordHash(password, stored.passwordHash)) {
    return { ok: false, status: 401, error: 'Invalid username or password.' };
  }

  if (input.expectedRole && stored.role !== input.expectedRole) {
    return {
      ok: false,
      status: 403,
      error:
        stored.role === 'admin'
          ? 'This is an Admin account. Please select Admin Login.'
          : 'This is a Staff account. Please select Staff Login.',
    };
  }

  return {
    ok: true,
    user: {
      id: stored.id,
      username: stored.username,
      displayName: stored.displayName,
      role: stored.role,
      source: 'store',
      createdAt: stored.createdAt,
    },
  };
}

export function listPublicUsers(): AuthUser[] {
  const result: AuthUser[] = [];
  const envAdmin = getEnvAdminConfig();
  const envStaff = getEnvStaffConfig();

  if (envAdmin) {
    result.push({
      id: 'env-admin',
      username: envAdmin.username,
      displayName: 'Clinic Admin (Environment)',
      role: 'admin',
      source: 'env',
    });
  }
  if (envStaff) {
    result.push({
      id: 'env-staff',
      username: envStaff.username,
      displayName: 'Front Desk Staff (Environment)',
      role: 'staff',
      source: 'env',
    });
  }

  for (const u of listStoredUsers()) {
    if (envAdmin && u.username === envAdmin.username) continue;
    if (envStaff && u.username === envStaff.username) continue;
    result.push({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      source: 'store',
      createdAt: u.createdAt,
    });
  }

  return result;
}

export function createOrUpdateUserAccount(input: {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; status: number; error: string } {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!username || username.length < 3) {
    return { ok: false, status: 400, error: 'Username must be at least 3 characters.' };
  }
  if (!displayName) {
    return { ok: false, status: 400, error: 'Display name is required.' };
  }
  if (!password || password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }

  const envAdmin = getEnvAdminConfig();
  const envStaff = getEnvStaffConfig();
  if ((envAdmin && username === envAdmin.username) || (envStaff && username === envStaff.username)) {
    return {
      ok: false,
      status: 409,
      error: 'That username is managed by environment secrets and cannot be overwritten here.',
    };
  }

  const saved = upsertStoredUser({
    username,
    displayName,
    role: input.role,
    passwordHash: hashPassword(password),
  });

  return {
    ok: true,
    user: {
      id: saved.id,
      username: saved.username,
      displayName: saved.displayName,
      role: saved.role,
      source: 'store',
      createdAt: saved.createdAt,
    },
  };
}

export function removeUserAccount(
  id: string,
  actingUserId: string,
): { ok: true } | { ok: false; status: number; error: string } {
  if (id === actingUserId) {
    return { ok: false, status: 400, error: 'You cannot delete the currently signed-in account.' };
  }
  if (id === 'env-admin' || id === 'env-staff') {
    return { ok: false, status: 400, error: 'Environment-configured accounts cannot be removed here.' };
  }

  const stored = listStoredUsers();
  const target = stored.find((u) => u.id === id);
  if (!target) {
    return { ok: false, status: 404, error: 'User account not found.' };
  }

  if (target.role === 'admin') {
    const remainingAdmins =
      stored.filter((u) => u.role === 'admin' && u.id !== id).length + (getEnvAdminConfig() ? 1 : 0);
    if (remainingAdmins < 1) {
      return { ok: false, status: 400, error: 'At least one Admin account must remain active.' };
    }
  }

  const deleted = deleteStoredUser(id);
  if (!deleted) {
    return { ok: false, status: 404, error: 'User account not found.' };
  }
  return { ok: true };
}

export function requireAuth(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    const user = verifyAuthToken(token);
    if (!user) {
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'You do not have permission for this action.' });
      return;
    }

    req.authUser = user;
    next();
  };
}
