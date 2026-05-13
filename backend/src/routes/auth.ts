import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { setCookie, deleteCookie } from 'hono/cookie';
import { validateRequest, schemas } from '../middleware/validator';
import { authenticateToken } from '../middleware/auth';
import { getSupabase } from '../utils/supabase';
import type { AppEnv } from '../types/env';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const auth = new Hono<AppEnv>();

auth.post('/login', validateRequest(schemas.login), async (c) => {
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Login] Supabase secrets not configured');
    return c.json({ error: 'Server configuration error: Supabase secrets missing' }, 500);
  }
  if (!c.env.JWT_SECRET) {
    console.error('[Login] JWT_SECRET not configured');
    return c.json({ error: 'Server configuration error: JWT_SECRET missing' }, 500);
  }

  const { email, password } = await c.req.json();
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  let user: any, employee: any;
  try {
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;
    user = userData;

    if (user) {
      const { data: empData } = await supabase
        .from('Employee')
        .select('*')
        .eq('userId', user.id)
        .maybeSingle();
      employee = empData;
    }
  } catch (err) {
    console.error('[Login] Database error:', err);
    return c.json({ error: 'Database connection failed' }, 500);
  }

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const hashedInput = await hashPassword(password);
  if (user.password !== hashedInput) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload = {
    userId: user.id,
    role: user.role,
    employeeId: employee?.id,
    empId: employee?.employeeId,
    name: employee ? `${employee.firstName} ${employee.lastName}` : 'Admin',
    mustChangePassword: user.mustChangePassword,
  };

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);

  const isProduction = c.env.NODE_ENV === 'production';
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  });

  return c.json({ success: true, user: payload, token });
});

auth.post('/change-password', authenticateToken, async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'currentPassword and newPassword are required' }, 400);
  }
  if (newPassword.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const userId = c.get('user').userId;
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: user, error } = await supabase
    .from('User')
    .select('password')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) return c.json({ error: 'User not found' }, 404);

  const hashedCurrent = await hashPassword(currentPassword);
  if (user.password !== hashedCurrent) {
    return c.json({ error: 'Current password is incorrect' }, 401);
  }

  const hashedNew = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('User')
    .update({ password: hashedNew, mustChangePassword: false, updatedAt: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) return c.json({ error: updateError.message }, 500);

  return c.json({ success: true, message: 'Password changed successfully' });
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

export default auth;
