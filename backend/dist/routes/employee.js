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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const document_1 = require("../services/document");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// All employees (including admins who are also employees)
router.use(auth_1.authenticateToken);
router.get('/requests', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
        return res.status(403).json({ error: 'User is not linked to an employee profile' });
    }
    const requests = yield prisma.documentRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
})));
router.post('/requests', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
        return res.status(403).json({ error: 'User is not linked to an employee profile' });
    }
    const { docType, docLang, reason } = req.body;
    // Generate a Request ID
    const count = yield prisma.documentRequest.count();
    const requestId = `REQ-${(count + 1).toString().padStart(3, '0')}`;
    const newRequest = yield prisma.documentRequest.create({
        data: {
            requestId,
            docType,
            docLang,
            reason,
            employeeId,
        },
    });
    // In a real scenario, this might be sent to a queue. For now, we simulate async generation.
    (0, document_1.triggerDocumentGeneration)(newRequest.id);
    res.status(201).json(newRequest);
})));
exports.default = router;
