import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { TEMPLATE_FIELD_DEFINITIONS } from '../utils/templateFields';
import { getPrisma } from '../utils/prisma';
import { AppEnv } from '../types';

const employee = new Hono<AppEnv>();

employee.use('*', authenticateToken);

employee.get('/requests', async (c) => {
  const user = c.get('user');
  const employeeId = user.employeeId;
  if (!employeeId) {
    return c.json({ error: 'User is not linked to an employee profile' }, 403);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  const requests = await prisma.documentRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
  
  return c.json(requests);
});

employee.get('/template-fields/:docType', async (c) => {
  const docType = c.req.param('docType');
  const fields = TEMPLATE_FIELD_DEFINITIONS[docType];
  if (fields === undefined) {
    return c.json({ error: 'Unknown document type' }, 404);
  }
  return c.json(fields);
});

const documentRequestSchema = z.object({
  docType: z.enum(['salary_cert', 'payslip_copy', 'tax_50', 'emp_cert', 'visa_letter']),
  docLang: z.enum(['TH', 'EN']),
  reason: z.enum(['financial', 'visa', 'education', 'other']),
  templateFields: z.record(z.string(), z.string()).optional(),
});

employee.post('/requests', async (c) => {
  const user = c.get('user');
  const employeeId = user.employeeId;
  if (!employeeId) {
    return c.json({ error: 'User is not linked to an employee profile' }, 403);
  }

  const body = await c.req.json();
  const result = documentRequestSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid request data', details: result.error.format() }, 400);
  }
  const { docType, docLang, reason, templateFields } = result.data;

  const fieldDefs = TEMPLATE_FIELD_DEFINITIONS[docType] || [];
  const requiredUserFields = fieldDefs.filter((f) => !f.autoFilled && f.required);
  const missingFields = requiredUserFields.filter((f) => !templateFields?.[f.key]);
  if (missingFields.length > 0) {
    return c.json({
      error: 'Missing required template fields',
      missingFields: missingFields.map((f) => ({ key: f.key, label: f.label })),
    }, 400);
  }
  
  const prisma = getPrisma(c.env.DATABASE_URL);
  const count = await prisma.documentRequest.count();
  const requestId = `REQ-${(count + 1).toString().padStart(3, '0')}`;

  // Requested -> routed to HR: the request is created PENDING and stays there
  // until HR issues the physical document (see admin.ts POST /requests/:id/issue).
  const newRequest = await prisma.documentRequest.create({
    data: {
      requestId,
      docType,
      docLang,
      reason,
      employeeId,
      templateFields: templateFields || {},
    },
  });

  return c.json(newRequest, 201);
});

export default employee;
