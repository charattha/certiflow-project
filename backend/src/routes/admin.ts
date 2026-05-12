import { Hono } from 'hono';
import { Prisma, Role } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateDocument } from '../services/document';
import { SystemLogger } from '../utils/logger';
import { getPrisma } from '../utils/prisma';
import { z } from 'zod';

/**
 * Cloudflare Worker friendly hashing using SubtleCrypto (SHA-256).
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const admin = new Hono();

admin.use('*', authenticateToken, requireRole(['SUPER_ADMIN', 'GENERAL_ADMIN']));

admin.get('/users', async (c) => {
  const role = c.req.query('role');
  const whereClause: Prisma.UserWhereInput = role ? { role: role as Role } : {};
  const prisma = getPrisma(c.env.DATABASE_URL);
  
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      employee: true
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(users);
});

admin.get('/requests', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const requests = await prisma.documentRequest.findMany({
    include: {
      employee: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(requests);
});

admin.post('/requests/:id/trigger', async (c) => {
  const id = c.req.param('id');
  const prisma = getPrisma(c.env.DATABASE_URL);
  
  const request = await prisma.documentRequest.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!request) return c.json({ error: 'Request not found' }, 404);

  const updatedRequest = await generateDocument(request.id, c.env);
  return c.json({ message: 'Document triggered successfully', request: updatedRequest });
});

admin.post('/users/:id/reset-password', async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');
  const requestorRole = user.role;
  const requestorId = user.userId;
  const prisma = getPrisma(c.env.DATABASE_URL);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    include: { employee: true }
  });

  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
    return c.json({ error: 'Forbidden: General Admins can only reset Employee passwords' }, 403);
  }

  let rawIdSource = '';
  const employee = targetUser.employee;
  if (employee?.thai_id) rawIdSource = employee.thai_id;
  else if (employee?.passport_no) rawIdSource = employee.passport_no;

  const newPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: targetId },
    data: { 
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: true
    }
  });

  await SystemLogger.logAction(requestorId, requestorRole, 'PASSWORD_RESET', targetId, {
    targetRole: targetUser.role
  }, c.env);

  return c.json({ message: 'Password reset successfully', defaultPassword: newPassword });
});

const singleUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EMPLOYEE', 'GENERAL_ADMIN', 'SUPER_ADMIN']),
  emp_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  thai_id: z.string().optional(),
  passport_no: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

admin.post('/users', async (c) => {
  const user = c.get('user');
  const requestorRole = user.role;
  const requestorId = user.userId;
  const prisma = getPrisma(c.env.DATABASE_URL);

  const body = await c.req.json();
  const result = singleUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);
  }

  const { email, role, emp_id, first_name, last_name, thai_id, passport_no, department, position } = result.data;

  if (role === 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admins must be created via direct database access' }, 403);
  }

  if (requestorRole === 'GENERAL_ADMIN' && role !== 'EMPLOYEE') {
    return c.json({ error: 'Forbidden: General Admins can only create Employees' }, 403);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return c.json({ error: 'User with this email already exists' }, 400);

  const rawIdSource = thai_id || passport_no || '';
  const defaultPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
  const hashedPassword = await hashPassword(defaultPassword);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      }
    });

    if (role === 'EMPLOYEE' || emp_id) {
      await tx.employee.create({
        data: {
          employeeId: emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          firstName: first_name || 'New',
          lastName: last_name || 'Employee',
          thai_id,
          passport_no,
          department,
          position,
          userId: user.id
        }
      });
    }

    return user;
  });

  await SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role }, c.env);

  return c.json({ message: 'User created successfully', userId: newUser.id, defaultPassword }, 201);
});

admin.delete('/users/:id', requireRole(['SUPER_ADMIN']), async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');
  const requestorId = user.userId;
  const prisma = getPrisma(c.env.DATABASE_URL);

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  if (targetUser.role === 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admins can only be deleted via direct database access' }, 403);
  }

  if (targetId === requestorId) return c.json({ error: 'Self-deletion is not permitted' }, 400);

  await prisma.$transaction(async (tx) => {
    await tx.employee.deleteMany({ where: { userId: targetId } });
    await tx.user.delete({ where: { id: targetId } });
  });

  await SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_DELETED', targetId, undefined, c.env);
  return c.json({ message: 'User deleted successfully from database' });
});

export default admin;
