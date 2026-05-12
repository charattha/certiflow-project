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
exports.cleanupExpiredDocuments = exports.triggerDocumentGeneration = exports.generateDocument = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const generateDocument = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    // Simulate document generation latency (Craftsman Agent Worker)
    yield new Promise((resolve) => setTimeout(resolve, 1500));
    // 3-day file expiration logic
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    const request = yield prisma.documentRequest.update({
        where: { id: requestId },
        data: {
            status: 'COMPLETED',
            fileUrl: `/downloads/${requestId}.pdf`,
            expiresAt,
        },
    });
    return request;
});
exports.generateDocument = generateDocument;
// Helper for exponential backoff
const delay = (ms) => new Promise(res => setTimeout(res, ms));
// Fire and forget wrapper for async document generation with Resilience Backoff
const triggerDocumentGeneration = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            yield (0, exports.generateDocument)(requestId);
            console.log(`[Success] Document generated on attempt ${attempt + 1} for request ${requestId}`);
            return; // successful execution
        }
        catch (err) {
            attempt++;
            console.error(`[Error] Failed to generate document for request ${requestId}. Attempt ${attempt}/${maxRetries}`);
            if (attempt >= maxRetries) {
                console.error(`[Fatal] Final attempt failed for request ${requestId}. Document generation aborted.`);
                // In reality, flag this request status as 'FAILED' in db here so Admin can see it
                break;
            }
            // Exponential backoff: 2s, 4s, 8s...
            const backoffDelay = Math.pow(2, attempt) * 1000;
            console.log(`Waiting ${backoffDelay}ms before next retry...`);
            yield delay(backoffDelay);
        }
    }
});
exports.triggerDocumentGeneration = triggerDocumentGeneration;
// Cleanup Service: Logic to handle the 3-day file expiration
const cleanupExpiredDocuments = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expiredRequests = yield prisma.documentRequest.findMany({
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
            // In a real system, we would delete the physical file here (e.g., from AWS S3 or local FS)
            console.log(`Cleaning up expired document: ${req.fileUrl}`);
            yield prisma.documentRequest.update({
                where: { id: req.id },
                data: {
                    fileUrl: null, // Remove access
                },
            });
        }
    }
    catch (error) {
        console.error('Error during cleanup service:', error);
    }
});
exports.cleanupExpiredDocuments = cleanupExpiredDocuments;
// Run cleanup every hour
setInterval(exports.cleanupExpiredDocuments, 1000 * 60 * 60);
