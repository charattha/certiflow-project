import express from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { triggerDocumentGeneration } from '../services/document';
import { asyncHandler } from '../middleware/errorHandler';
import { TEMPLATE_FIELD_DEFINITIONS } from '../utils/templateFields';
import prisma from '../utils/prisma';

const router = express.Router();

// All employees (including admins who are also employees)
router.use(authenticateToken);

router.get('/requests', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    return res.status(403).json({ error: 'User is not linked to an employee profile' });
  }

  const requests = await prisma.documentRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
  
  res.json(requests);
}));

// Return the field definitions for a specific docType so the frontend can render the form
router.get('/template-fields/:docType', authenticateToken, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { docType } = req.params;
  const fields = TEMPLATE_FIELD_DEFINITIONS[docType];
  if (fields === undefined) {
    return res.status(404).json({ error: 'Unknown document type' });
  }
  res.json(fields);
}));

// Validation schema for document requests
const documentRequestSchema = z.object({
  docType: z.enum(['salary_cert', 'payslip_copy', 'tax_50', 'emp_cert', 'visa_letter']),
  docLang: z.enum(['TH', 'EN']),
  reason: z.enum(['financial', 'visa', 'education', 'other']),
  templateFields: z.record(z.string(), z.string()).optional(), // Key-value pairs for the .docx placeholders
});

router.post('/requests', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    return res.status(403).json({ error: 'User is not linked to an employee profile' });
  }

  const result = documentRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request data', details: result.error.format() });
  }
  const { docType, docLang, reason, templateFields } = result.data;

  // Validate that all required user-input fields are present
  const fieldDefs = TEMPLATE_FIELD_DEFINITIONS[docType] || [];
  const requiredUserFields = fieldDefs.filter((f) => !f.autoFilled && f.required);
  const missingFields = requiredUserFields.filter((f) => !templateFields?.[f.key]);
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required template fields',
      missingFields: missingFields.map((f) => ({ key: f.key, label: f.label })),
    });
  }
  
  // Generate a Request ID
  const count = await prisma.documentRequest.count();
  const requestId = `REQ-${(count + 1).toString().padStart(3, '0')}`;

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

  // In a real scenario, this might be sent to a queue. For now, we simulate async generation.
  triggerDocumentGeneration(newRequest.id);

  res.status(201).json(newRequest);
}));

// Serve the generated .docx file for download
router.get('/downloads/:filename', authenticateToken, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { filename } = req.params;
  // Basic security: only allow alphanumeric, dash, and .docx
  if (!/^[A-Za-z0-9\-]+\.docx$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(__dirname, '../../downloads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or has expired' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.sendFile(filePath);
}));

export default router;
