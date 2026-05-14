import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { triggerDocumentGeneration } from '../services/document';
import { getSupabase } from '../utils/supabase';
import type { AppEnv } from '../types/env';

const employee = new Hono<AppEnv>();

employee.use('*', authenticateToken);

employee.get('/requests', async (c) => {
  const user = c.get('user');
  const employeeId = user.employeeId;
  console.log('[GET /requests] user payload:', JSON.stringify(user));
  if (!employeeId) return c.json({ error: 'User is not linked to an employee profile' }, 403);

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('DocumentRequest')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

const documentRequestSchema = z.object({
  doc_type: z.enum(['salary_cert', 'emp_cert', 'visa_letter', 'payslip_copy', 'tax_50']),
  doc_lang: z.enum(['TH', 'EN']),
  reason: z.enum(['financial', 'visa', 'education', 'other']),
  // User-supplied template overrides (prefix, employment_date, last_working_date)
  template_fields: z.record(z.string(), z.string()).optional(),
  // Visa-only fields
  country_prefer_travel: z.string().optional(),
  departure_date: z.string().optional(),
  last_travel_date: z.string().optional(),
  arrival_date: z.string().optional(),
  on_duty_date: z.string().optional(),
});

employee.post('/requests', async (c) => {
  const user = c.get('user');
  const employeeId = user.employeeId;
  if (!employeeId) return c.json({ error: 'User is not linked to an employee profile' }, 403);

  const body = await c.req.json();
  const result = documentRequestSchema.safeParse(body);
  if (!result.success) return c.json({ error: 'Invalid request data', details: result.error.format() }, 400);

  const { doc_type, doc_lang, reason, template_fields, country_prefer_travel, departure_date, last_travel_date, arrival_date, on_duty_date } = result.data;

  if (doc_type === 'visa_letter') {
    if (!country_prefer_travel || !departure_date || !last_travel_date || !arrival_date || !on_duty_date) {
      return c.json({ error: 'Visa letter requires: country_prefer_travel, departure_date, last_travel_date, arrival_date, on_duty_date' }, 400);
    }
  }

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { count } = await supabase
    .from('DocumentRequest')
    .select('*', { count: 'exact', head: true });

  const request_id = `REQ-${((count ?? 0) + 1).toString().padStart(3, '0')}`;

  const { data: newRequest, error } = await supabase
    .from('DocumentRequest')
    .insert({
      id: crypto.randomUUID(),
      request_id,
      doc_type,
      doc_lang,
      reason,
      employee_id: employeeId,
      template_fields: template_fields ?? null,
      country_prefer_travel: country_prefer_travel ?? null,
      departure_date: departure_date ?? null,
      last_travel_date: last_travel_date ?? null,
      arrival_date: arrival_date ?? null,
      on_duty_date: on_duty_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /requests] Insert error:', JSON.stringify(error));
    return c.json({ error: error.message }, 500);
  }

  c.executionCtx.waitUntil(triggerDocumentGeneration(newRequest.id, c.env));

  return c.json(newRequest, 201);
});

employee.get('/downloads/:requestId', async (c) => {
  const requestId = c.req.param('requestId');
  const user = c.get('user');
  const employeeId = user.employeeId;

  const supabase = getSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: request } = await supabase
    .from('DocumentRequest')
    .select('file_url, employee_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) return c.json({ error: 'Request not found' }, 404);
  if (request.employee_id !== employeeId) return c.json({ error: 'Forbidden' }, 403);
  if (request.status !== 'COMPLETED' || !request.file_url) return c.json({ error: 'Document not ready' }, 404);

  return c.json({ url: request.file_url });
});

export default employee;
