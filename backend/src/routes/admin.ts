import { Hono } from 'hono';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateDocument } from '../services/document';
import { SystemLogger } from '../utils/logger';
import { getSupabase } from '../utils/supabase';
import { z } from 'zod';
import type { AppEnv } from '../types/env';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const admin = new Hono<AppEnv>();

admin.use('*', authenticateToken, requireRole(['SUPER_ADMIN', 'GENERAL_ADMIN']));

admin.get('/users', async (c) => {
  const role = c.req.query('role');
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase
    .from('User')
    .select('id, email, role, createdAt, Employee(*)')
    .order('createdAt', { ascending: false });

  if (role) query = query.eq('role', role);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

admin.get('/requests', async (c) => {
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('DocumentRequest')
    .select('*, Employee(*)')
    .order('createdAt', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

admin.post('/requests/:id/trigger', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: request, error } = await supabase
    .from('DocumentRequest')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!request) return c.json({ error: 'Request not found' }, 404);

  const updatedRequest = await generateDocument(request.id, c.env);
  return c.json({ message: 'Document triggered successfully', request: updatedRequest });
});

admin.post('/users/:id/reset-password', async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');
  const requestorRole = user.role;
  const requestorId = user.userId;
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: targetUser, error } = await supabase
    .from('User')
    .select('*, Employee(*)')
    .eq('id', targetId)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
    return c.json({ error: 'Forbidden: General Admins can only reset Employee passwords' }, 403);
  }

  const employee = targetUser.Employee?.[0] ?? null;
  let rawIdSource = '';
  if (employee?.thai_id) rawIdSource = employee.thai_id;
  else if (employee?.passport_no) rawIdSource = employee.passport_no;

  const newPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
  const hashedPassword = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from('User')
    .update({
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', targetId);

  if (updateError) return c.json({ error: updateError.message }, 500);

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
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

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

  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) return c.json({ error: 'User with this email already exists' }, 400);

  const rawIdSource = thai_id || passport_no || '';
  const defaultPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
  const hashedPassword = await hashPassword(defaultPassword);

  const { data: newUser, error: userCreateError } = await supabase
    .from('User')
    .insert({ email, password: hashedPassword, role })
    .select('id')
    .single();

  if (userCreateError) return c.json({ error: userCreateError.message }, 500);

  if (role === 'EMPLOYEE' || emp_id) {
    const { error: empCreateError } = await supabase
      .from('Employee')
      .insert({
        employeeId: emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: first_name || 'New',
        lastName: last_name || 'Employee',
        thai_id,
        passport_no,
        department,
        position,
        userId: newUser.id,
      });

    if (empCreateError) {
      await supabase.from('User').delete().eq('id', newUser.id);
      return c.json({ error: empCreateError.message }, 500);
    }
  }

  await SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role }, c.env);

  return c.json({ message: 'User created successfully', userId: newUser.id, defaultPassword }, 201);
});

admin.delete('/users/:id', requireRole(['SUPER_ADMIN']), async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');
  const requestorId = user.userId;
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: targetUser, error } = await supabase
    .from('User')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  if (targetUser.role === 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admins can only be deleted via direct database access' }, 403);
  }

  if (targetId === requestorId) return c.json({ error: 'Self-deletion is not permitted' }, 400);

  await supabase.from('Employee').delete().eq('userId', targetId);
  const { error: deleteError } = await supabase.from('User').delete().eq('id', targetId);

  if (deleteError) return c.json({ error: deleteError.message }, 500);

  await SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_DELETED', targetId, undefined, c.env);
  return c.json({ message: 'User deleted successfully from database' });
});

export default admin;
