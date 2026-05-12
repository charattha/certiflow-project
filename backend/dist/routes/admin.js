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
const logger_1 = require("../utils/logger");
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Only Super Admin and General Admin
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(['SUPER_ADMIN', 'GENERAL_ADMIN']));
// Build Admin APIs to query all users
router.get('/users', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { role } = req.query;
    const whereClause = role ? { role: role } : {};
    const users = yield prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            employee: true
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(users);
})));
// Build Admin APIs to query all DOCUMENT_REQUESTS
router.get('/requests', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requests = yield prisma.documentRequest.findMany({
        include: {
            employee: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
})));
router.post('/requests/:id/trigger', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (typeof id !== 'string')
        return res.status(400).json({ error: 'Invalid ID format' });
    const request = yield prisma.documentRequest.findUnique({
        where: { id },
        include: { employee: true },
    });
    if (!request)
        return res.status(404).json({ error: 'Request not found' });
    // Admins can trigger/reprint documents
    const updatedRequest = yield (0, document_1.generateDocument)(request.id);
    res.json({ message: 'Document triggered successfully', request: updatedRequest });
})));
// Hierarchical Password Reset
router.post('/users/:id/reset-password', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const targetId = req.params.id;
    const requestorRole = req.user.role;
    const requestorId = req.user.userId || req.user.id; // Support both token variants depending on sign-in
    const targetUser = yield prisma.user.findUnique({
        where: { id: targetId },
        include: { employee: true }
    });
    if (!targetUser)
        return res.status(404).json({ error: 'User not found' });
    // 1. Hierarchy Check
    if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: 'Forbidden: General Admins can only reset Employee passwords' });
    }
    // 2. Determine New Password (last 6 of thai_id, or default if no thai_id)
    let newPassword = 'password123';
    if (((_a = targetUser.employee) === null || _a === void 0 ? void 0 : _a.thai_id) && targetUser.employee.thai_id.length >= 6) {
        newPassword = targetUser.employee.thai_id.slice(-6);
    }
    // 3. Hash and Update
    const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
    yield prisma.user.update({
        where: { id: targetId },
        data: {
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null
        }
    });
    // 4. Audit Log
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'PASSWORD_RESET', targetId, {
        targetRole: targetUser.role
    });
    // Note: Session invalidation requires a token blacklist or refreshing JWT secrets. 
    // For now, updating the password resets their login flow on the next token expiry.
    res.json({ message: 'Password reset successfully', defaultPassword: newPassword });
})));
// Bulk Employee Upsert Zod Schema
const employeeBulkSchema = zod_1.z.array(zod_1.z.object({
    emp_id: zod_1.z.string().min(1),
    first_name: zod_1.z.string().min(1),
    last_name: zod_1.z.string().min(1),
    thai_id: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
    email: zod_1.z.string().email()
}));
// Bulk Employee Upsert
router.post('/employees/bulk', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestorRole = req.user.role;
    const requestorId = req.user.userId || req.user.id;
    // Validate Input
    const result = employeeBulkSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: 'Invalid payload schema', details: result.error.errors });
    const employees = result.data;
    let upsertedCount = 0;
    // Execute in a transaction to ensure atomicity
    yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        for (const emp of employees) {
            // Upsert the User record first
            const defaultPassword = emp.thai_id && emp.thai_id.length >= 6 ? emp.thai_id.slice(-6) : 'password123';
            const hashedPassword = yield bcrypt_1.default.hash(defaultPassword, 10);
            const user = yield tx.user.upsert({
                where: { email: emp.email },
                update: {}, // Don't override existing passwords if they exist
                create: {
                    email: emp.email,
                    password: hashedPassword,
                    role: 'EMPLOYEE'
                }
            });
            // Upsert the Employee record
            yield tx.employee.upsert({
                where: { employeeId: emp.emp_id },
                update: {
                    firstName: emp.first_name,
                    lastName: emp.last_name,
                    thai_id: emp.thai_id,
                    department: emp.department,
                    position: emp.position,
                },
                create: {
                    employeeId: emp.emp_id,
                    firstName: emp.first_name,
                    lastName: emp.last_name,
                    thai_id: emp.thai_id,
                    department: emp.department,
                    position: emp.position,
                    userId: user.id
                }
            });
            upsertedCount++;
        }
    }));
    // Log Action
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'BULK_UPSERT', undefined, {
        count: upsertedCount
    });
    res.json({ message: `Successfully upserted ${upsertedCount} employees` });
})));
exports.default = router;
