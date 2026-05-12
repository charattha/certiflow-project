import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { validateRequest, schemas } from '../middleware/validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Limit to 5 attempts per 5 minutes per email address
const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 300, // per 300 seconds (5 minutes)
});

router.post('/login', validateRequest(schemas.login), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  try {
    // Consume 1 point for this email attempt
    await loginRateLimiter.consume(email);
  } catch (rateLimiterRes: any) {
    const remainingMinutes = Math.ceil(rateLimiterRes.msBeforeNext / 60000);
    return res.status(429).json({ 
      error: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).` 
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Handle successful login: delete history points for this email
  await loginRateLimiter.delete(email);

  const payload = {
    userId: user.id,
    role: user.role,
    employeeId: user.employee?.id,
    empId: user.employee?.employeeId,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Admin',
    mustChangePassword: user.mustChangePassword,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  // Set JWT in Secure/HttpOnly Cookie
  // In production: sameSite='none' + secure=true is required for cross-origin (Pages ↔ Railway)
  // In development: sameSite='lax' works fine without HTTPS
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  // Return user info (token is in the cookie, but also sent for frontend state management)
  res.json({ success: true, user: payload, token });
}));

// Change Password — AUTHENTICATED, derives userId from JWT
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  })
});

router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const userId = req.user.userId; // Derived from JWT — never trust client body
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return res.status(401).json({ error: 'Incorrect current password' });

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { 
      password: hashedNewPassword,
      mustChangePassword: false 
    }
  });

  res.json({ success: true, message: 'Password updated successfully' });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
