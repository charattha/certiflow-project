import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { getPrisma } from '../utils/prisma';
import { mergeTemplateFields } from '../utils/templateFields';

/**
 * Cloudflare Worker version of document generation.
 * In a real production environment, this would:
 * 1. Fetch the .docx template from Supabase Storage or R2.
 * 2. Fill it using Docxtemplater.
 * 3. Upload the result back to Supabase Storage or R2.
 * 4. Return the public URL.
 */

export const generateDocument = async (requestId: string, env: any) => {
  const prisma = getPrisma(env.DATABASE_URL);

  const docRequest = await prisma.documentRequest.findUnique({
    where: { id: requestId },
    include: {
      employee: true,
    },
  });

  if (!docRequest) {
    throw new Error(`DocumentRequest not found: ${requestId}`);
  }

  // 3-day file expiration logic
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);

  // For now, we simulate success without physical file generation 
  // until Supabase Storage buckets are configured by the user.
  const updated = await prisma.documentRequest.update({
    where: { id: requestId },
    data: {
      status: 'COMPLETED',
      fileUrl: `https://placeholder-url.com/${docRequest.requestId}.docx`,
      expiresAt,
    },
  });

  return updated;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const triggerDocumentGeneration = async (requestId: string, env: any) => {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await generateDocument(requestId, env);
      return;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        const prisma = getPrisma(env.DATABASE_URL);
        await prisma.documentRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED' },
        }).catch(() => {});
        break;
      }
      await delay(2000);
    }
  }
};
