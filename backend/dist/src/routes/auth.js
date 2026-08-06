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
const validator_1 = require("../middleware/validator");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../utils/supabase");
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
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Login] Supabase secrets not configured');
        return c.json({ error: 'Server configuration error: Supabase secrets missing' }, 500);
    }
    if (!c.env.JWT_SECRET) {
        console.error('[Login] JWT_SECRET not configured');
        return c.json({ error: 'Server configuration error: JWT_SECRET missing' }, 500);
    }
    const { email, password } = yield c.req.json();
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    let user, employee;
    try {
        const { data: userData, error: userError } = yield supabase
            .from('User')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        if (userError)
            throw userError;
        user = userData;
        if (user) {
            const { data: empData } = yield supabase
                .from('Employee')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            employee = empData;
        }
    }
    catch (err) {
        console.error('[Login] Database error:', err);
        return c.json({ error: 'Database connection failed' }, 500);
    }
    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    const hashedInput = yield hashPassword(password);
    if (user.password !== hashedInput) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    const payload = {
        userId: user.id,
        role: user.role,
        employeeId: employee === null || employee === void 0 ? void 0 : employee.id,
        empId: employee === null || employee === void 0 ? void 0 : employee.employee_id,
        name: employee ? `${employee.first_name} ${employee.last_name}` : 'Admin',
        mustChangePassword: user.must_change_password,
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
        maxAge: 8 * 60 * 60,
        path: '/',
    });
    return c.json({ success: true, user: payload, token });
}));
auth.post('/change-password', auth_1.authenticateToken, (c) => __awaiter(void 0, void 0, void 0, function* () {
    const { currentPassword, newPassword } = yield c.req.json();
    if (!currentPassword || !newPassword) {
        return c.json({ error: 'currentPassword and newPassword are required' }, 400);
    }
    if (newPassword.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }
    const userId = c.get('user').userId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: user, error } = yield supabase
        .from('User')
        .select('password')
        .eq('id', userId)
        .maybeSingle();
    if (error || !user)
        return c.json({ error: 'User not found' }, 404);
    const hashedCurrent = yield hashPassword(currentPassword);
    if (user.password !== hashedCurrent) {
        return c.json({ error: 'Current password is incorrect' }, 401);
    }
    const hashedNew = yield hashPassword(newPassword);
    const { error: updateError } = yield supabase
        .from('User')
        .update({ password: hashedNew, must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', userId);
    if (updateError)
        return c.json({ error: updateError.message }, 500);
    return c.json({ success: true, message: 'Password changed successfully' });
}));
auth.post('/logout', (c) => {
    (0, cookie_1.deleteCookie)(c, 'token', { path: '/' });
    return c.json({ success: true, message: 'Logged out successfully' });
});
exports.default = auth;
