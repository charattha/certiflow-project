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
const hono_1 = require("hono");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const prisma_1 = require("../utils/prisma");
const zod_1 = require("zod");
/**
 * Cloudflare Worker friendly hashing using SubtleCrypto (SHA-256).
 */
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = yield crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}
const admin = new hono_1.Hono();
admin.use('*', auth_1.authenticateToken, (0, auth_1.requireRole)(['SUPER_ADMIN', 'GENERAL_ADMIN']));
admin.get('/users', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const role = c.req.query('role');
    const whereClause = role ? { role: role } : {};
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
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
    return c.json(users);
}));
admin.get('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const requests = yield prisma.documentRequest.findMany({
        include: {
            employee: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    return c.json(requests);
}));
// HR issues the physical document -> PENDING becomes WAITING_FOR_PICKUP.
admin.post('/requests/:id/issue', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const request = yield prisma.documentRequest.findUnique({ where: { id } });
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    if (request.status !== 'PENDING') {
        return c.json({ error: `Cannot issue a request in ${request.status} status` }, 400);
    }
    const updatedRequest = yield prisma.documentRequest.update({
        where: { id },
        data: { status: 'WAITING_FOR_PICKUP' },
    });
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'REQUEST_ISSUED', id, {
        requestId: request.requestId,
    }, c.env);
    return c.json({ message: 'Document marked as issued — waiting for pickup', request: updatedRequest });
}));
// Employee has picked up the physical document -> WAITING_FOR_PICKUP becomes DONE.
admin.post('/requests/:id/pickup', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const request = yield prisma.documentRequest.findUnique({ where: { id } });
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    if (request.status !== 'WAITING_FOR_PICKUP') {
        return c.json({ error: `Cannot confirm pickup for a request in ${request.status} status` }, 400);
    }
    const updatedRequest = yield prisma.documentRequest.update({
        where: { id },
        data: { status: 'DONE' },
    });
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'REQUEST_PICKED_UP', id, {
        requestId: request.requestId,
    }, c.env);
    return c.json({ message: 'Pickup confirmed', request: updatedRequest });
}));
admin.post('/users/:id/reset-password', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const targetId = c.req.param('id');
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const targetUser = yield prisma.user.findUnique({
        where: { id: targetId },
        include: { employee: true }
    });
    if (!targetUser)
        return c.json({ error: 'User not found' }, 404);
    if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
        return c.json({ error: 'Forbidden: General Admins can only reset Employee passwords' }, 403);
    }
    let rawIdSource = '';
    const employee = targetUser.employee;
    if (employee === null || employee === void 0 ? void 0 : employee.thai_id)
        rawIdSource = employee.thai_id;
    else if (employee === null || employee === void 0 ? void 0 : employee.passport_no)
        rawIdSource = employee.passport_no;
    const newPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
    const hashedPassword = yield hashPassword(newPassword);
    yield prisma.user.update({
        where: { id: targetId },
        data: {
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null,
            mustChangePassword: true
        }
    });
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'PASSWORD_RESET', targetId, {
        targetRole: targetUser.role
    }, c.env);
    return c.json({ message: 'Password reset successfully', defaultPassword: newPassword });
}));
const singleUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['EMPLOYEE', 'GENERAL_ADMIN', 'SUPER_ADMIN']),
    emp_id: zod_1.z.string().optional(),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    thai_id: zod_1.z.string().optional(),
    passport_no: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
});
admin.post('/users', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const body = yield c.req.json();
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
    const existingUser = yield prisma.user.findUnique({ where: { email } });
    if (existingUser)
        return c.json({ error: 'User with this email already exists' }, 400);
    const rawIdSource = thai_id || passport_no || '';
    const defaultPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
    const hashedPassword = yield hashPassword(defaultPassword);
    const newUser = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield tx.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
            }
        });
        if (role === 'EMPLOYEE' || emp_id) {
            yield tx.employee.create({
                data: {
                    employeeId: emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                    firstName: first_name || 'New',
                    lastName: last_name || 'Employee',
                    thai_id,
                    passport_no,
                    department,
                    position,
                    userId: user.id
                }
            });
        }
        return user;
    }));
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role }, c.env);
    return c.json({ message: 'User created successfully', userId: newUser.id, defaultPassword }, 201);
}));
admin.delete('/users/:id', (0, auth_1.requireRole)(['SUPER_ADMIN']), (c) => __awaiter(void 0, void 0, void 0, function* () {
    const targetId = c.req.param('id');
    const user = c.get('user');
    const requestorId = user.userId;
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const targetUser = yield prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser)
        return c.json({ error: 'User not found' }, 404);
    if (targetUser.role === 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden: Super Admins can only be deleted via direct database access' }, 403);
    }
    if (targetId === requestorId)
        return c.json({ error: 'Self-deletion is not permitted' }, 400);
    yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.employee.deleteMany({ where: { userId: targetId } });
        yield tx.user.delete({ where: { id: targetId } });
    }));
    yield logger_1.SystemLogger.logAction(requestorId, 'SUPER_ADMIN', 'USER_DELETED', targetId, undefined, c.env);
    return c.json({ message: 'User deleted successfully from database' });
}));
exports.default = admin;
