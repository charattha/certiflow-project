import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import prisma from '../utils/prisma';
import { mergeTemplateFields } from '../utils/templateFields';

// Template file paths — keyed by docType
const TEMPLATE_PATHS: Record<string, string> = {
  salary_cert: path.join(__dirname, '../templates/salary_cert.docx'),
  emp_cert:    path.join(__dirname, '../templates/emp_cert.docx'),
  visa_letter: path.join(__dirname, '../templates/visa_letter.docx'),
};

const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');

/**
 * Fills a .docx template with employee + user-supplied fields and saves it.
 * Returns the relative file path (used as fileUrl on the DocumentRequest).
 */
const fillDocxTemplate = (
  docType: string,
  outputFileName: string,
  data: Record<string, string>
): string => {
  const templatePath = TEMPLATE_PATHS[docType];

  if (!templatePath || !fs.existsSync(templatePath)) {
    // No template for this docType (e.g., payslip_copy, tax_50) — return a placeholder
    return `/downloads/${outputFileName}`;
  }

  // Ensure downloads directory exists
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Custom delimiters matching the template's {field} syntax
    delimiters: { start: '{', end: '}' },
  });

  doc.render(data);

  const outputBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outputPath = path.join(DOWNLOADS_DIR, outputFileName);
  fs.writeFileSync(outputPath, outputBuffer);

  return `/downloads/${outputFileName}`;
};

export const generateDocument = async (requestId: string) => {
  // Simulate document generation latency (Craftsman Agent Worker)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 3-day file expiration logic
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  // Fetch the full request with employee profile for auto-fill
  const docRequest = await prisma.documentRequest.findUnique({
    where: { id: requestId },
    include: {
      employee: true,
    },
  });

  if (!docRequest) {
    throw new Error(`DocumentRequest not found: ${requestId}`);
  }

  const userFields = (docRequest.templateFields as Record<string, string>) || {};
  const mergedData = mergeTemplateFields(docRequest.docType, docRequest.employee, userFields);

  const outputFileName = `${docRequest.requestId}.docx`;
  const fileUrl = fillDocxTemplate(docRequest.docType, outputFileName, mergedData);

  const updated = await prisma.documentRequest.update({
    where: { id: requestId },
    data: {
      status: 'COMPLETED',
      fileUrl,
      expiresAt,
    },
  });

  return updated;
};

// Helper for exponential backoff
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Fire and forget wrapper for async document generation with Resilience Backoff
export const triggerDocumentGeneration = async (requestId: string) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await generateDocument(requestId);
      console.log(`[Success] Document generated on attempt ${attempt + 1} for request ${requestId}`);
      return; // successful execution
    } catch (err) {
      attempt++;
      console.error(`[Error] Failed to generate document for request ${requestId}. Attempt ${attempt}/${maxRetries}`);
      
      if (attempt >= maxRetries) {
        console.error(`[Fatal] Final attempt failed for request ${requestId}. Document generation aborted.`);
        // Flag this request status as 'FAILED' in db so Admin can see it
        await prisma.documentRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED' },
        }).catch(() => {}); // Swallow secondary failure
        break;
      }
      
      // Exponential backoff: 2s, 4s, 8s...
      const backoffDelay = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${backoffDelay}ms before next retry...`);
      await delay(backoffDelay);
    }
  }
};

// Cleanup Service: Logic to handle the 3-day file expiration
export const cleanupExpiredDocuments = async () => {
  try {
    const expiredRequests = await prisma.documentRequest.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        fileUrl: {
          not: null,
        },
      },
    });

    for (const req of expiredRequests) {
      // Delete the physical .docx file if it exists
      if (req.fileUrl) {
        const filePath = path.join(DOWNLOADS_DIR, path.basename(req.fileUrl));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted expired file: ${filePath}`);
        }
      }
      
      await prisma.documentRequest.update({
        where: { id: req.id },
        data: {
          fileUrl: null, // Remove access
        },
      });
    }
  } catch (error) {
    console.error('Error during cleanup service:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredDocuments, 1000 * 60 * 60);
