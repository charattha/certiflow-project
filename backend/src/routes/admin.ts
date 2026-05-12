import express from 'express';
import { Prisma, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { generateDocument } from '../services/document';
import { asyncHandler } from '../middleware/errorHandler';
import { SystemLogger } from '../utils/logger';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = express.Router();

// Only Super Admin and General Admin
router.use(authenticateToken, requireRole(['SUPER_ADMIN', 'GENERAL_ADMIN']));

// Build Admin APIs to query all users
router.get('/users', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { role } = req.query;
  const whereClause: Prisma.UserWhereInput = role ? { role: role as Role } : {};
  
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
  res.json(users);
}));

// Build Admin APIs to query all DOCUMENT_REQUESTS
router.get('/requests', asyncHandler(async (req: express.Request, res: express.Response) => {
  const requests = await prisma.documentRequest.findMany({
    include: {
      employee: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}));

router.post('/requests/:id/trigger', asyncHandler(async (req: express.Request, res: express.Response) => {
  const id = req.params.id;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID format' });
  
  const request = await prisma.documentRequest.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!request) return res.status(404).json({ error: 'Request not found' });

  // Admins can trigger/reprint documents
  const updatedRequest = await generateDocument(request.id);
  
  res.json({ message: 'Document triggered successfully', request: updatedRequest });
}));

// Hierarchical Password Reset
router.post('/users/:id/reset-password', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const targetId = req.params.id as string;
  const requestorRole = req.user.role;
  const requestorId = (req.user.userId || req.user.id) as string;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    include: { employee: true }
  });

  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // 1. Hierarchy Check
  if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'Forbidden: General Admins can only reset Employee passwords' });
  }

  // 2. Default Password Logic (Priority: thai_id > passport_no > fallback)
  let rawIdSource = '';
  const employee = targetUser.employee;
  if (employee?.thai_id) rawIdSource = employee.thai_id;
  else if (employee?.passport_no) rawIdSource = employee.passport_no;

  const newPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'password123';
  
  // 3. Hash and Update
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: targetId },
    data: { 
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: true // Force change after admin reset
    }
  });

  // 4. Audit Log
  await SystemLogger.logAction(requestorId, requestorRole, 'PASSWORD_RESET', targetId, {
    targetRole: targetUser.role
  });

  res.json({ message: 'Password reset successfully. User must change password on next login.' });
}));

// Single User Creation Zod Schema
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

// Single User Creation
router.post('/users', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const requestorRole = req.user.role;
  const requestorId = req.user.userId || req.user.id;

  const result = singleUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.format() });
  }

  const { email, role, emp_id, first_name, last_name, thai_id, passport_no, department, position } = result.data;

  // SuperAdmin creation is restricted to direct database only
  if (role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Super Admins must be created via direct database access' });
  }

  // Hierarchy enforcement: Only Super Admin can create other Admins (General Admins)
  if (requestorRole === 'GENERAL_ADMIN' && role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'Forbidden: General Admins can only create Employees' });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

  // Default password logic
  const rawIdSource = thai_id || passport_no || '';
  const defaultPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

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

  await SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role });

  res.status(201).json({ message: 'User created successfully', userId: newUser.id });
}));

// DELETE User (Direct Database Action - SuperAdmin Only)
router.delete('/users/:id', requireRole(['SUPER_ADMIN']), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const targetId = req.params.id;
  const requestorId = req.user.userId || req.user.id;

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // SuperAdmins cannot be deleted via API
  if (targetUser.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Super Admins can only be deleted via direct database access' });
  }

  // Prevent deleting self
  if (targetId === requestorId) return res.status(400).json({ error: 'Self-deletion is not permitted' });

  await prisma.$transaction(async (tx) => {
    // Cascade-ish delete (Delete Employee first if exists)
    await tx.employee.deleteMany({ where: { userId: targetId } });
    await tx.user.delete({ where: { id: targetId } });
  });

  await SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_DELETED', targetId);
  res.json({ message: 'User deleted successfully from database' });
}));

// PATCH User Zod Schema
const patchUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['EMPLOYEE', 'GENERAL_ADMIN']).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  emp_id: z.string().optional(),
  thai_id: z.string().optional(),
  passport_no: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

// PATCH User (Direct Database Action - SuperAdmin Only)
router.patch('/users/:id', requireRole(['SUPER_ADMIN']), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const targetId = req.params.id;
  const requestorId = req.user.userId || req.user.id;

  const result = patchUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.format() });
  }
  const data = result.data;

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // SuperAdmins cannot be patched via API
  if (targetUser.role === 'SUPER_ADMIN' || data.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Super Admin records can only be modified via direct database access' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetId },
    data: {
      email: data.email,
      role: data.role,
      employee: data.role === 'EMPLOYEE' ? {
        update: {
          firstName: data.first_name,
          lastName: data.last_name,
          employeeId: data.emp_id,
          thai_id: data.thai_id,
          passport_no: data.passport_no,
          department: data.department,
          position: data.position,
        }
      } : undefined
    },
    include: { employee: true }
  });

  await SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_UPDATED', targetId);
  res.json({ message: 'User updated successfully', user: updatedUser });
}));

// Bulk Employee Upsert Zod Schema
const employeeBulkSchema = z.array(z.object({
  emp_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  thai_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email()
}));

// Bulk Employee Upsert
router.post('/employees/bulk', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const requestorRole = req.user.role;
  const requestorId = req.user.userId || req.user.id;

  // Validate Input
  const result = employeeBulkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload schema', details: result.error.format() });
  }
  
  const employees = result.data;
  let upsertedCount = 0;

  // Pre-hash all passwords in parallel to avoid sequential bcrypt bottleneck
  const hashedPasswords = await Promise.all(
    employees.map(emp => {
      const defaultPassword = emp.thai_id && emp.thai_id.length >= 6 ? emp.thai_id.slice(-6) : 'password123';
      return bcrypt.hash(defaultPassword, 12);
    })
  );

  // Execute in a transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const hashedPassword = hashedPasswords[i];

      const user = await tx.user.upsert({
        where: { email: emp.email },
        update: {}, // Don't override existing passwords if they exist
        create: {
          email: emp.email,
          password: hashedPassword,
          role: 'EMPLOYEE'
        }
      });

      // Upsert the Employee record
      await tx.employee.upsert({
        where: { employeeId: emp.emp_id },
        update: {
          firstName: emp.first_name,
          lastName: emp.last_name,
          thai_id: emp.thai_id,
          department: emp.department,
          position: emp.position,
        } as any, // Cast as any to bypass temporary prisma cache type issues
        create: {
          employeeId: emp.emp_id,
          firstName: emp.first_name,
          lastName: emp.last_name,
          thai_id: emp.thai_id,
          department: emp.department,
          position: emp.position,
          userId: user.id
        } as any // Cast as any to bypass temporary prisma cache type issues
      });
      upsertedCount++;
    }
  });

  // Log Action
  await SystemLogger.logAction(requestorId, requestorRole, 'BULK_UPSERT', undefined, {
    count: upsertedCount
  });

  res.json({ message: `Successfully upserted ${upsertedCount} employees` });
}));

export default router;
