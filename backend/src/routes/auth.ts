import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { getPrisma } from '../utils/prisma';
import { validateRequest, schemas } from '../middleware/validator';
import { authenticateToken } from '../middleware/auth';

const auth = new Hono();

auth.post('/login', validateRequest(schemas.login), async (c) => {
  const { email, password } = await c.req.json();
  const prisma = getPrisma(c.env.DATABASE_URL);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload = {
    userId: user.id,
    role: user.role,
    employeeId: user.employee?.id,
    empId: user.employee?.employeeId,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Admin',
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
    maxAge: 8 * 60 * 60, // 8 hours in seconds
    path: '/',
  });

  return c.json({ success: true, user: payload, token });
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  })
});

auth.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), async (c) => {
  const user = c.get('user');
  const { currentPassword, newPassword } = await c.req.json();
  const prisma = getPrisma(c.env.DATABASE_URL);

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return c.json({ error: 'User not found' }, 404);

  const isValid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!isValid) return c.json({ error: 'Incorrect current password' }, 401);

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.userId },
    data: { 
      password: hashedNewPassword,
      mustChangePassword: false 
    }
  });

  return c.json({ success: true, message: 'Password updated successfully' });
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

export default auth;
