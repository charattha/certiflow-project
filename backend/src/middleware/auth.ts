import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { getCookie } from 'hono/cookie';
import { AppEnv, AppUser } from '../types';

export const authenticateToken = async (c: Context<AppEnv>, next: Next) => {
  const JWT_SECRET = c.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return c.json({ error: 'JWT_SECRET not configured' }, 500);
  }

  let token = getCookie(c, 'token');

  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return c.json({ error: 'Access denied. No token provided.' }, 401);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload as unknown as AppUser);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 403);
  }
};

export const requireRole = (roles: string[]) => {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Insufficient role' }, 403);
    }
    await next();
  };
};
