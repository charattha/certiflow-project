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
exports.requireRole = exports.authenticateToken = void 0;
const jose_1 = require("jose");
const cookie_1 = require("hono/cookie");
const authenticateToken = (c, next) => __awaiter(void 0, void 0, void 0, function* () {
    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return c.json({ error: 'JWT_SECRET not configured' }, 500);
    }
    let token = (0, cookie_1.getCookie)(c, 'token');
    if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }
    if (!token) {
        return c.json({ error: 'Access denied. No token provided.' }, 401);
    }
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = yield (0, jose_1.jwtVerify)(token, secret);
        c.set('user', payload);
        yield next();
    }
    catch (err) {
        return c.json({ error: 'Invalid or expired token' }, 403);
    }
});
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (c, next) => __awaiter(void 0, void 0, void 0, function* () {
        const user = c.get('user');
        if (!user || !roles.includes(user.role)) {
            return c.json({ error: 'Forbidden: Insufficient role' }, 403);
        }
        yield next();
    });
};
exports.requireRole = requireRole;
