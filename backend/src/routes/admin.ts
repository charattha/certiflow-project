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
    .select('id, email, role, created_at, Employee(*)')
    .order('created_at', { ascending: false });

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
    .order('created_at', { ascending: false });

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

admin.delete('/requests/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: req, error } = await supabase
    .from('DocumentRequest')
    .select('id, file_url')
    .eq('id', id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!req) return c.json({ error: 'Request not found' }, 404);

  // Remove the stored file if present
  if (req.file_url) {
    const fileName = `${id}.pdf`;
    await supabase.storage.from('documents').remove([fileName]).catch(() => {});
  }

  const { error: delError } = await supabase.from('DocumentRequest').delete().eq('id', id);
  if (delError) return c.json({ error: delError.message }, 500);

  await SystemLogger.logAction(user.userId, user.role, 'REQUEST_DELETED', id, undefined, c.env);
  return c.json({ message: 'Request deleted' });
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
      failed_login_attempts: 0,
      lockout_until: null,
      must_change_password: true,
      updated_at: new Date().toISOString(),
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
    .insert({ id: crypto.randomUUID(), email, password: hashedPassword, role, updated_at: new Date().toISOString() })
    .select('id')
    .single();

  if (userCreateError) return c.json({ error: userCreateError.message }, 500);

  if (role === 'EMPLOYEE' || emp_id) {
    const { error: empCreateError } = await supabase
      .from('Employee')
      .insert({
        id: crypto.randomUUID(),
        employee_id: emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: first_name || 'New',
        last_name: last_name || 'Employee',
        thai_id,
        passport_no,
        department,
        position,
        user_id: newUser.id,
        updated_at: new Date().toISOString(),
      });

    if (empCreateError) {
      await supabase.from('User').delete().eq('id', newUser.id);
      return c.json({ error: empCreateError.message }, 500);
    }
  }

  await SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role }, c.env);

  return c.json({ message: 'User created successfully', userId: newUser.id, defaultPassword }, 201);
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  emp_id: z.string().optional(),
  thai_id: z.string().optional(),
  passport_no: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
});

admin.patch('/users/:id', async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');
  const requestorRole = user.role;
  const requestorId = user.userId;
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const body = await c.req.json();
  const result = updateUserSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);

  const { email, first_name, last_name, emp_id, thai_id, passport_no, department, position } = result.data;

  if (email) {
    const { error } = await supabase.from('User').update({ email, updated_at: new Date().toISOString() }).eq('id', targetId);
    if (error) return c.json({ error: error.message }, 500);
  }

  const empUpdate: Record<string, any> = {};
  if (first_name !== undefined) empUpdate.first_name = first_name;
  if (last_name !== undefined) empUpdate.last_name = last_name;
  if (emp_id !== undefined) empUpdate.employee_id = emp_id;
  if (thai_id !== undefined) empUpdate.thai_id = thai_id;
  if (passport_no !== undefined) empUpdate.passport_no = passport_no;
  if (department !== undefined) empUpdate.department = department;
  if (position !== undefined) empUpdate.position = position;

  if (Object.keys(empUpdate).length > 0) {
    empUpdate.updated_at = new Date().toISOString();
    const { error } = await supabase.from('Employee').update(empUpdate).eq('user_id', targetId);
    if (error) return c.json({ error: error.message }, 500);
  }

  await SystemLogger.logAction(requestorId, requestorRole, 'USER_UPDATED', targetId, result.data, c.env);
  return c.json({ message: 'User updated successfully' });
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

  await supabase.from('Employee').delete().eq('user_id', targetId);
  const { error: deleteError } = await supabase.from('User').delete().eq('id', targetId);

  if (deleteError) return c.json({ error: deleteError.message }, 500);

  await SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_DELETED', targetId, undefined, c.env);
  return c.json({ message: 'User deleted successfully from database' });
});

function normalizePrefix(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/\./g, '');
  if (v === 'mr') return 'Mr.';
  if (v === 'ms') return 'Ms.';
  if (v === 'mrs') return 'Mrs.';
  return null;
}

function normalizeGender(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'male' || v === 'm') return 'Male';
  if (v === 'female' || v === 'f') return 'Female';
  return null;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

admin.post('/employees/bulk', async (c) => {
  const user = c.get('user');
  const requestorId = user.userId;
  const requestorRole = user.role;
  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const rows: any[] = await c.req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: 'No employee data provided' }, 400);
  }

  const results: { email: string; status: string; error?: string }[] = [];

  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) { results.push({ email: '(missing)', status: 'skipped', error: 'No email' }); continue; }

    try {
      const { data: existing } = await supabase.from('User').select('id').eq('email', email).maybeSingle();
      if (existing) { results.push({ email, status: 'skipped', error: 'Email already exists' }); continue; }

      const rawId = row.thai_id || row.passport_no || '';
      const defaultPassword = rawId.length >= 6 ? rawId.slice(-6) : 'admin123';
      const hashedPassword = await hashPassword(defaultPassword);

      const { data: newUser, error: userErr } = await supabase
        .from('User')
        .insert({ id: crypto.randomUUID(), email, password: hashedPassword, role: 'EMPLOYEE', updated_at: new Date().toISOString() })
        .select('id').single();

      if (userErr) { results.push({ email, status: 'error', error: userErr.message }); continue; }

      const { error: empErr } = await supabase.from('Employee').insert({
        id: crypto.randomUUID(),
        employee_id: row.emp_id?.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        prefix: normalizePrefix(row.prefix),
        first_name: row.first_name?.trim() || 'New',
        last_name: row.last_name?.trim() || 'Employee',
        gender: normalizeGender(row.gender),
        thai_id: row.thai_id?.trim() || null,
        passport_no: row.passport_no?.trim() || null,
        department: row.department?.trim() || null,
        position: row.position?.trim() || null,
        salary: row.salary ? parseFloat(row.salary) : null,
        employment_date: parseDate(row.employment_date),
        resignation_date: parseDate(row.resignation_date),
        user_id: newUser.id,
        updated_at: new Date().toISOString(),
      });

      if (empErr) {
        await supabase.from('User').delete().eq('id', newUser.id);
        results.push({ email, status: 'error', error: empErr.message });
      } else {
        results.push({ email, status: 'created' });
      }
    } catch (err: any) {
      results.push({ email, status: 'error', error: err.message });
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  const failed = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  await SystemLogger.logAction(requestorId, requestorRole, 'BULK_IMPORT', undefined, { created, failed, skipped }, c.env);

  return c.json({ message: `Import complete: ${created} created, ${skipped} skipped, ${failed} failed`, results });
});

export default admin;
