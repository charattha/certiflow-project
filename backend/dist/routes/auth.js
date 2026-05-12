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
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const validator_1 = require("../middleware/validator");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'certipaws_super_secret_jwt_key';
// Limit to 5 attempts per 5 minutes per email address
const loginRateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 5, // 5 attempts
    duration: 300, // per 300 seconds (5 minutes)
});
router.post('/login', (0, validator_1.validateRequest)(validator_1.schemas.login), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { email, password } = req.body;
    try {
        // Consume 1 point for this email attempt
        yield loginRateLimiter.consume(email);
    }
    catch (rateLimiterRes) {
        const remainingMinutes = Math.ceil(rateLimiterRes.msBeforeNext / 60000);
        return res.status(429).json({
            error: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`
        });
    }
    const user = yield prisma.user.findUnique({
        where: { email },
        include: { employee: true },
    });
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isValid = yield bcrypt_1.default.compare(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Handle successful login: delete history points for this email
    yield loginRateLimiter.delete(email);
    const payload = {
        userId: user.id,
        role: user.role,
        employeeId: (_a = user.employee) === null || _a === void 0 ? void 0 : _a.id,
        empId: (_b = user.employee) === null || _b === void 0 ? void 0 : _b.employeeId,
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Admin',
    };
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    // Set JWT in Secure/HttpOnly Cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });
    res.json({ success: true, user: payload });
})));
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});
exports.default = router;
