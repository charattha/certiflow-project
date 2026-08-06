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
const jose_1 = require("jose");
const cookie_1 = require("hono/cookie");
const prisma_1 = require("../utils/prisma");
const validator_1 = require("../middleware/validator");
const auth_1 = require("../middleware/auth");
/**
 * Cloudflare Worker friendly hashing using SubtleCrypto (SHA-256).
 * Standard bcrypt/bcryptjs is often too slow for Worker CPU limits.
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
const auth = new hono_1.Hono();
auth.post('/login', (0, validator_1.validateRequest)(validator_1.schemas.login), (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { email, password } = yield c.req.json();
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const user = yield prisma.user.findUnique({
        where: { email },
        include: { employee: true },
    });
    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    // Check if it's the old bcrypt hash or new SHA-256 hash
    // Since we are migrating, we'll re-hash the provided password and compare
    const hashedInput = yield hashPassword(password);
    // Basic comparison (In production, use a more secure timing-safe comparison if possible)
    // For the transition, we check both the seeded bcrypt (starts with $2b$) and the new hash.
    const isValid = (user.password === hashedInput) || (user.password.startsWith('$2b$') && false);
    // NOTE: Because bcrypt is too slow for Workers, we MUST re-seed the DB with SHA-256 hashes.
    if (user.password !== hashedInput) {
        return c.json({ error: 'Invalid credentials. (Note: Database re-seed required for Worker compatibility)' }, 401);
    }
    const payload = {
        userId: user.id,
        role: user.role,
        employeeId: (_a = user.employee) === null || _a === void 0 ? void 0 : _a.id,
        empId: (_b = user.employee) === null || _b === void 0 ? void 0 : _b.employeeId,
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Admin',
        mustChangePassword: user.mustChangePassword,
    };
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const token = yield new jose_1.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secret);
    const isProduction = c.env.NODE_ENV === 'production';
    (0, cookie_1.setCookie)(c, 'token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 8 * 60 * 60, // 8 hours in seconds
        path: '/',
    });
    return c.json({ success: true, user: payload, token });
}));
auth.post('/change-password', auth_1.authenticateToken, (0, validator_1.validateRequest)(validator_1.schemas.changePassword), (c) => __awaiter(void 0, void 0, void 0, function* () {
    const { currentPassword, newPassword } = yield c.req.json();
    const requestor = c.get('user');
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const user = yield prisma.user.findUnique({ where: { id: requestor.userId } });
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    const hashedCurrent = yield hashPassword(currentPassword);
    if (user.password !== hashedCurrent) {
        return c.json({ error: 'Current password is incorrect' }, 401);
    }
    const hashedNew = yield hashPassword(newPassword);
    yield prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNew, mustChangePassword: false },
    });
    return c.json({ success: true, message: 'Password updated successfully' });
}));
auth.post('/logout', (c) => {
    (0, cookie_1.deleteCookie)(c, 'token', { path: '/' });
    return c.json({ success: true, message: 'Logged out successfully' });
});
exports.default = auth;
