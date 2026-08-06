"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDocumentGeneration = exports.generateDocument = void 0;
const prisma_1 = require("../utils/prisma");
/**
 * Cloudflare Worker version of document generation.
 * In a real production environment, this would:
 * 1. Fetch the .docx template from Supabase Storage or R2.
 * 2. Fill it using Docxtemplater.
 * 3. Upload the result back to Supabase Storage or R2.
 * 4. Return the public URL.
 */
const generateDocument = (requestId, env) => __awaiter(void 0, void 0, void 0, function* () {
    const prisma = (0, prisma_1.getPrisma)(env.DATABASE_URL);
    const docRequest = yield prisma.documentRequest.findUnique({
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
    const updated = yield prisma.documentRequest.update({
        where: { id: requestId },
        data: {
            status: 'COMPLETED',
            fileUrl: `https://placeholder-url.com/${docRequest.requestId}.docx`,
            expiresAt,
        },
    });
    return updated;
});
exports.generateDocument = generateDocument;
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const triggerDocumentGeneration = (requestId, env) => __awaiter(void 0, void 0, void 0, function* () {
    const maxRetries = 2;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            yield (0, exports.generateDocument)(requestId, env);
            return;
        }
        catch (err) {
            attempt++;
            if (attempt >= maxRetries) {
                const prisma = (0, prisma_1.getPrisma)(env.DATABASE_URL);
                yield prisma.documentRequest.update({
                    where: { id: requestId },
                    data: { status: 'REJECTED' },
                }).catch(() => { });
                break;
            }
            yield delay(2000);
        }
    }
});
exports.triggerDocumentGeneration = triggerDocumentGeneration;
