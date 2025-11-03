import type { Context } from 'hono';
import type { Bindings, User, Session } from '../db/schema';
import bcrypt from 'bcryptjs';

// Generate session ID
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create session
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt.toISOString()).run();

  return sessionId;
}

// Get session
export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  const result = await db.prepare(`
    SELECT * FROM sessions
    WHERE id = ? AND expires_at > datetime('now')
  `).bind(sessionId).first();

  return result as Session | null;
}

// Update session activity
export async function updateSessionActivity(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare(`
    UPDATE sessions
    SET last_activity = datetime('now')
    WHERE id = ?
  `).bind(sessionId).run();
}

// Delete session
export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

// Clean expired sessions
export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}

// Get user from session
export async function getUserFromSession(db: D1Database, sessionId: string): Promise<User | null> {
  if (!sessionId) return null;

  const session = await getSession(db, sessionId);
  if (!session) return null;

  const user = await db.prepare(`
    SELECT * FROM users WHERE id = ? AND status = 'active'
  `).bind(session.user_id).first();

  if (user) {
    await updateSessionActivity(db, sessionId);
  }

  return user as User | null;
}

// Get user permissions
export async function getUserPermissions(db: D1Database, userId: number): Promise<string[]> {
  const result = await db.prepare(`
    SELECT r.permissions
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `).bind(userId).all();

  const allPermissions = new Set<string>();
  
  for (const row of result.results) {
    const permissions = JSON.parse(row.permissions as string);
    permissions.forEach((p: string) => allPermissions.add(p));
  }

  return Array.from(allPermissions);
}

// Check if user has permission
export async function hasPermission(db: D1Database, userId: number, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(db, userId);
  
  // System owner has all permissions
  if (permissions.includes('*')) return true;
  
  return permissions.includes(permission);
}

// Middleware to require authentication
export async function requireAuth(c: Context<{ Bindings: Bindings }>) {
  const sessionId = c.req.cookie('session_id');
  
  if (!sessionId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const user = await getUserFromSession(c.env.DB, sessionId);
  
  if (!user) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  c.set('user', user);
}

// Middleware to require specific permission
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Bindings }>) => {
    const user = c.get('user') as User;
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const allowed = await hasPermission(c.env.DB, user.id, permission);
    
    if (!allowed) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
  };
}

// Get current user from context
export function getCurrentUser(c: Context): User | null {
  return c.get('user') || null;
}

// Audit log helper
export async function logAudit(
  db: D1Database,
  actorId: number | null,
  action: string,
  objectType: string,
  objectId: number | null,
  changes: any,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO audit_logs (actor_id, action, object_type, object_id, changes, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    actorId,
    action,
    objectType,
    objectId,
    JSON.stringify(changes),
    ipAddress,
    userAgent
  ).run();
}
