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
const document_1 = require("../services/document");
const logger_1 = require("../utils/logger");
const supabase_1 = require("../utils/supabase");
const zod_1 = require("zod");
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
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    let query = supabase
        .from('User')
        .select('id, email, role, created_at, Employee(*)')
        .order('created_at', { ascending: false });
    if (role)
        query = query.eq('role', role);
    const { data, error } = yield query;
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json(data);
}));
admin.get('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = yield supabase
        .from('DocumentRequest')
        .select('*, Employee(*)')
        .order('created_at', { ascending: false });
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json(data);
}));
// Manually (re)trigger document generation — e.g. to retry a failed generation or reprint.
admin.post('/requests/:id/trigger', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: request, error } = yield supabase
        .from('DocumentRequest')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    yield (0, document_1.generateDocument)(request.id, c.env);
    return c.json({ message: 'Document triggered successfully' });
}));
// HR issues the generated document -> PENDING becomes WAITING_FOR_PICKUP.
admin.post('/requests/:id/issue', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: request, error } = yield supabase
        .from('DocumentRequest')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    if (request.status !== 'PENDING') {
        return c.json({ error: `Cannot issue a request in ${request.status} status` }, 400);
    }
    const { data: updatedRequest, error: updateError } = yield supabase
        .from('DocumentRequest')
        .update({ status: 'WAITING_FOR_PICKUP', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (updateError)
        return c.json({ error: updateError.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'REQUEST_ISSUED', id, {
        requestId: request.request_id,
    }, c.env);
    return c.json({ message: 'Document marked as issued — waiting for pickup', request: updatedRequest });
}));
// Employee has picked up the document -> WAITING_FOR_PICKUP becomes DONE.
admin.post('/requests/:id/pickup', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: request, error } = yield supabase
        .from('DocumentRequest')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    if (request.status !== 'WAITING_FOR_PICKUP') {
        return c.json({ error: `Cannot confirm pickup for a request in ${request.status} status` }, 400);
    }
    const { data: updatedRequest, error: updateError } = yield supabase
        .from('DocumentRequest')
        .update({ status: 'DONE', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (updateError)
        return c.json({ error: updateError.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'REQUEST_PICKED_UP', id, {
        requestId: request.request_id,
    }, c.env);
    return c.json({ message: 'Pickup confirmed', request: updatedRequest });
}));
admin.delete('/requests/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: req, error } = yield supabase
        .from('DocumentRequest')
        .select('id, file_url')
        .eq('id', id)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!req)
        return c.json({ error: 'Request not found' }, 404);
    // Remove the stored file if present
    if (req.file_url) {
        const fileName = `${id}.pdf`;
        yield supabase.storage.from('documents').remove([fileName]).catch(() => { });
    }
    const { error: delError } = yield supabase.from('DocumentRequest').delete().eq('id', id);
    if (delError)
        return c.json({ error: delError.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'REQUEST_DELETED', id, undefined, c.env);
    return c.json({ message: 'Request deleted' });
}));
admin.post('/users/:id/reset-password', (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const targetId = c.req.param('id');
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: targetUser, error } = yield supabase
        .from('User')
        .select('*, Employee(*)')
        .eq('id', targetId)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!targetUser)
        return c.json({ error: 'User not found' }, 404);
    if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
        return c.json({ error: 'Forbidden: General Admins can only reset Employee passwords' }, 403);
    }
    const employee = (_b = (_a = targetUser.Employee) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null;
    let rawIdSource = '';
    if (employee === null || employee === void 0 ? void 0 : employee.thai_id)
        rawIdSource = employee.thai_id;
    else if (employee === null || employee === void 0 ? void 0 : employee.passport_no)
        rawIdSource = employee.passport_no;
    const newPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
    const hashedPassword = yield hashPassword(newPassword);
    const { error: updateError } = yield supabase
        .from('User')
        .update({
        password: hashedPassword,
        failed_login_attempts: 0,
        lockout_until: null,
        must_change_password: true,
        updated_at: new Date().toISOString(),
    })
        .eq('id', targetId);
    if (updateError)
        return c.json({ error: updateError.message }, 500);
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'PASSWORD_RESET', targetId, {
        targetRole: targetUser.role
    }, c.env);
    return c.json({ message: 'Password reset successfully', defaultPassword: newPassword });
}));
const singleUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['EMPLOYEE', 'GENERAL_ADMIN', 'SUPER_ADMIN']),
    emp_id: zod_1.z.string().optional(),
    prefix: zod_1.z.string().optional(),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    thai_id: zod_1.z.string().optional(),
    passport_no: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
    salary: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    employment_date: zod_1.z.string().optional(),
    resignation_date: zod_1.z.string().optional(),
});
admin.post('/users', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const body = yield c.req.json();
    const result = singleUserSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);
    }
    const { email, role, emp_id, prefix, first_name, last_name, gender, thai_id, passport_no, department, position, salary, employment_date, resignation_date } = result.data;
    if (role === 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden: Super Admins must be created via direct database access' }, 403);
    }
    if (requestorRole === 'GENERAL_ADMIN' && role !== 'EMPLOYEE') {
        return c.json({ error: 'Forbidden: General Admins can only create Employees' }, 403);
    }
    const { data: existingUser } = yield supabase
        .from('User')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (existingUser)
        return c.json({ error: 'User with this email already exists' }, 400);
    const rawIdSource = thai_id || passport_no || '';
    const defaultPassword = rawIdSource.length >= 6 ? rawIdSource.slice(-6) : 'admin123';
    const hashedPassword = yield hashPassword(defaultPassword);
    const { data: newUser, error: userCreateError } = yield supabase
        .from('User')
        .insert({ id: crypto.randomUUID(), email, password: hashedPassword, role, updated_at: new Date().toISOString() })
        .select('id')
        .single();
    if (userCreateError)
        return c.json({ error: userCreateError.message }, 500);
    if (role === 'EMPLOYEE' || emp_id) {
        const { error: empCreateError } = yield supabase
            .from('Employee')
            .insert({
            id: crypto.randomUUID(),
            employee_id: emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
            prefix: normalizePrefix(prefix),
            first_name: first_name || 'New',
            last_name: last_name || 'Employee',
            gender: normalizeGender(gender),
            thai_id: thai_id || null,
            passport_no: passport_no || null,
            department: department || null,
            position: position || null,
            salary: salary ? parseFloat(String(salary)) : null,
            employment_date: parseDate(employment_date),
            resignation_date: parseDate(resignation_date),
            user_id: newUser.id,
            updated_at: new Date().toISOString(),
        });
        if (empCreateError) {
            yield supabase.from('User').delete().eq('id', newUser.id);
            return c.json({ error: empCreateError.message }, 500);
        }
    }
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'USER_CREATED', newUser.id, { role }, c.env);
    return c.json({ message: 'User created successfully', userId: newUser.id, defaultPassword }, 201);
}));
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    role: zod_1.z.enum(['EMPLOYEE', 'GENERAL_ADMIN']).optional(),
    prefix: zod_1.z.string().optional(),
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    emp_id: zod_1.z.string().optional(),
    thai_id: zod_1.z.string().optional(),
    passport_no: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
    salary: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    employment_date: zod_1.z.string().optional(),
    resignation_date: zod_1.z.string().optional(),
});
admin.patch('/users/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const targetId = c.req.param('id');
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    // Role-based access: GENERAL_ADMIN can only edit EMPLOYEE users
    const { data: targetUser, error: targetErr } = yield supabase
        .from('User').select('role').eq('id', targetId).maybeSingle();
    if (targetErr)
        return c.json({ error: targetErr.message }, 500);
    if (!targetUser)
        return c.json({ error: 'User not found' }, 404);
    if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
        return c.json({ error: 'Forbidden: General Admins can only edit Employee records' }, 403);
    }
    const body = yield c.req.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success)
        return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);
    const { email, role, prefix, first_name, last_name, gender, emp_id, thai_id, passport_no, department, position, salary, employment_date, resignation_date } = result.data;
    // Build User-level update
    const userUpdate = { updated_at: new Date().toISOString() };
    if (email)
        userUpdate.email = email;
    // Only SUPER_ADMIN can change role; GENERAL_ADMIN cannot
    if (role !== undefined && requestorRole === 'SUPER_ADMIN') {
        userUpdate.role = role;
    }
    const { data: updatedUser, error: userUpdateErr } = yield supabase
        .from('User')
        .update(userUpdate)
        .eq('id', targetId)
        .select('id, role, email')
        .single();
    if (userUpdateErr)
        return c.json({ error: userUpdateErr.message }, 500);
    const empUpdate = {};
    if (prefix !== undefined)
        empUpdate.prefix = normalizePrefix(prefix);
    if (first_name !== undefined)
        empUpdate.first_name = first_name;
    if (last_name !== undefined)
        empUpdate.last_name = last_name;
    if (gender !== undefined)
        empUpdate.gender = normalizeGender(gender);
    if (emp_id !== undefined)
        empUpdate.employee_id = emp_id;
    if (thai_id !== undefined)
        empUpdate.thai_id = thai_id;
    if (passport_no !== undefined)
        empUpdate.passport_no = passport_no;
    if (department !== undefined)
        empUpdate.department = department;
    if (position !== undefined)
        empUpdate.position = position;
    if (salary !== undefined)
        empUpdate.salary = salary ? parseFloat(String(salary)) : null;
    if (employment_date !== undefined)
        empUpdate.employment_date = parseDate(employment_date);
    if (resignation_date !== undefined)
        empUpdate.resignation_date = parseDate(resignation_date);
    if (Object.keys(empUpdate).length > 0) {
        empUpdate.updated_at = new Date().toISOString();
        const { error } = yield supabase.from('Employee').update(empUpdate).eq('user_id', targetId);
        if (error)
            return c.json({ error: error.message }, 500);
    }
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'USER_UPDATED', targetId, result.data, c.env);
    return c.json({ message: 'User updated successfully', role: updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.role });
}));
admin.delete('/users/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const targetId = c.req.param('id');
    const user = c.get('user');
    const requestorRole = user.role;
    const requestorId = user.userId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: targetUser, error } = yield supabase
        .from('User')
        .select('id, role')
        .eq('id', targetId)
        .maybeSingle();
    if (error)
        return c.json({ error: error.message }, 500);
    if (!targetUser)
        return c.json({ error: 'User not found' }, 404);
    if (targetUser.role === 'SUPER_ADMIN') {
        return c.json({ error: 'Forbidden: Super Admins can only be deleted via direct database access' }, 403);
    }
    // GENERAL_ADMIN can only delete EMPLOYEE users; SUPER_ADMIN can delete GENERAL_ADMIN or EMPLOYEE
    if (requestorRole === 'GENERAL_ADMIN' && targetUser.role !== 'EMPLOYEE') {
        return c.json({ error: 'Forbidden: General Admins can only delete Employee accounts' }, 403);
    }
    if (targetId === requestorId)
        return c.json({ error: 'Self-deletion is not permitted' }, 400);
    yield supabase.from('Employee').delete().eq('user_id', targetId);
    const { error: deleteError } = yield supabase.from('User').delete().eq('id', targetId);
    if (deleteError)
        return c.json({ error: deleteError.message }, 500);
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'USER_DELETED', targetId, undefined, c.env);
    return c.json({ message: 'User deleted successfully from database' });
}));
function normalizePrefix(raw) {
    if (!raw)
        return null;
    const v = raw.trim().toLowerCase().replace(/\./g, '');
    if (v === 'mr')
        return 'Mr.';
    if (v === 'ms')
        return 'Ms.';
    if (v === 'mrs')
        return 'Mrs.';
    return null;
}
function normalizeGender(raw) {
    if (!raw)
        return null;
    const v = raw.trim().toLowerCase();
    if (v === 'male' || v === 'm')
        return 'Male';
    if (v === 'female' || v === 'f')
        return 'Female';
    return null;
}
function parseDate(raw) {
    if (!raw || raw.trim() === '')
        return null;
    const d = new Date(raw.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
}
admin.post('/employees/bulk', (c) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const user = c.get('user');
    const requestorId = user.userId;
    const requestorRole = user.role;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const rows = yield c.req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
        return c.json({ error: 'No employee data provided' }, 400);
    }
    const results = [];
    for (const row of rows) {
        const email = (_a = row.email) === null || _a === void 0 ? void 0 : _a.trim();
        if (!email) {
            results.push({ email: '(missing)', status: 'skipped', error: 'No email' });
            continue;
        }
        try {
            const { data: existing } = yield supabase.from('User').select('id').eq('email', email).maybeSingle();
            if (existing) {
                results.push({ email, status: 'skipped', error: 'Email already exists' });
                continue;
            }
            const rawId = row.thai_id || row.passport_no || '';
            const defaultPassword = rawId.length >= 6 ? rawId.slice(-6) : 'admin123';
            const hashedPassword = yield hashPassword(defaultPassword);
            const { data: newUser, error: userErr } = yield supabase
                .from('User')
                .insert({ id: crypto.randomUUID(), email, password: hashedPassword, role: 'EMPLOYEE', updated_at: new Date().toISOString() })
                .select('id').single();
            if (userErr) {
                results.push({ email, status: 'error', error: userErr.message });
                continue;
            }
            const { error: empErr } = yield supabase.from('Employee').insert({
                id: crypto.randomUUID(),
                employee_id: ((_b = row.emp_id) === null || _b === void 0 ? void 0 : _b.trim()) || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                prefix: normalizePrefix(row.prefix),
                first_name: ((_c = row.first_name) === null || _c === void 0 ? void 0 : _c.trim()) || 'New',
                last_name: ((_d = row.last_name) === null || _d === void 0 ? void 0 : _d.trim()) || 'Employee',
                gender: normalizeGender(row.gender),
                thai_id: ((_e = row.thai_id) === null || _e === void 0 ? void 0 : _e.trim()) || null,
                passport_no: ((_f = row.passport_no) === null || _f === void 0 ? void 0 : _f.trim()) || null,
                department: ((_g = row.department) === null || _g === void 0 ? void 0 : _g.trim()) || null,
                position: ((_h = row.position) === null || _h === void 0 ? void 0 : _h.trim()) || null,
                salary: row.salary ? parseFloat(row.salary) : null,
                employment_date: parseDate(row.employment_date),
                resignation_date: parseDate(row.resignation_date),
                user_id: newUser.id,
                updated_at: new Date().toISOString(),
            });
            if (empErr) {
                yield supabase.from('User').delete().eq('id', newUser.id);
                results.push({ email, status: 'error', error: empErr.message });
            }
            else {
                results.push({ email, status: 'created' });
            }
        }
        catch (err) {
            results.push({ email, status: 'error', error: err.message });
        }
    }
    const created = results.filter(r => r.status === 'created').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    yield logger_1.SystemLogger.logAction(requestorId, requestorRole, 'BULK_IMPORT', undefined, { created, failed, skipped }, c.env);
    return c.json({ message: `Import complete: ${created} created, ${skipped} skipped, ${failed} failed`, results });
}));
// ─────────────────────────────────────────────
// SERVICE CHARGES CRUD
// ─────────────────────────────────────────────
const serviceChargeSchema = zod_1.z.object({
    employee_id: zod_1.z.string().uuid(),
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2000).max(2100),
    amount: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
});
// GET all service charges (with employee info)
admin.get('/service-charges', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = yield supabase
        .from('ServiceCharge')
        .select('*, Employee(id, employee_id, first_name, last_name, department)')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json(data);
}));
// POST create service charge
admin.post('/service-charges', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const body = yield c.req.json();
    const result = serviceChargeSchema.safeParse(body);
    if (!result.success)
        return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);
    const { employee_id, month, year, amount } = result.data;
    // Check for duplicate (same employee + month + year)
    const { data: existing } = yield supabase
        .from('ServiceCharge')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
    if (existing)
        return c.json({ error: 'A service charge for this employee/month/year already exists' }, 400);
    const { data: newCharge, error } = yield supabase
        .from('ServiceCharge')
        .insert({
        id: crypto.randomUUID(),
        employee_id,
        month,
        year,
        amount: parseFloat(String(amount)),
        updated_at: new Date().toISOString(),
    })
        .select('*, Employee(id, employee_id, first_name, last_name, department)')
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'SERVICE_CHARGE_CREATED', newCharge.id, { employee_id, month, year, amount }, c.env);
    return c.json(newCharge, 201);
}));
// PATCH update service charge amount
admin.patch('/service-charges/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const body = yield c.req.json();
    const amount = parseFloat(String(body.amount));
    if (isNaN(amount) || amount < 0)
        return c.json({ error: 'Invalid amount' }, 400);
    const { data, error } = yield supabase
        .from('ServiceCharge')
        .update({ amount, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, Employee(id, employee_id, first_name, last_name, department)')
        .single();
    if (error)
        return c.json({ error: error.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'SERVICE_CHARGE_UPDATED', id, { amount }, c.env);
    return c.json(data);
}));
// POST distribute total pool evenly across all active employees
admin.post('/service-charges/distribute', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const body = yield c.req.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const totalPool = parseFloat(String(body.total_pool));
    if (!month || !year || isNaN(totalPool) || totalPool <= 0) {
        return c.json({ error: 'Invalid payload: month, year, total_pool required' }, 400);
    }
    // Fetch all active employees (not resigned)
    const { data: employees, error: empErr } = yield supabase
        .from('Employee')
        .select('id')
        .or('resignation_date.is.null,resignation_date.gt.' + new Date().toISOString());
    if (empErr)
        return c.json({ error: empErr.message }, 500);
    if (!employees || employees.length === 0)
        return c.json({ error: 'No active employees found' }, 400);
    // total_pool is the per-employee amount — everyone gets the same amount
    const perEmployee = Math.round(totalPool * 100) / 100;
    // Upsert — overwrite if same employee+month+year already exists
    const rows = employees.map((emp) => ({
        id: crypto.randomUUID(),
        employee_id: emp.id,
        month,
        year,
        amount: perEmployee,
        updated_at: new Date().toISOString(),
    }));
    // Delete existing records for this month/year first, then insert fresh
    yield supabase
        .from('ServiceCharge')
        .delete()
        .eq('month', month)
        .eq('year', year);
    const { error: insertErr } = yield supabase.from('ServiceCharge').insert(rows);
    if (insertErr)
        return c.json({ error: insertErr.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'SERVICE_CHARGE_DISTRIBUTED', undefined, {
        month, year, total_pool: totalPool, per_employee: perEmployee, employee_count: employees.length,
    }, c.env);
    return c.json({
        message: `Distributed THB ${totalPool.toLocaleString()} across ${employees.length} employees`,
        per_employee: perEmployee,
        employee_count: employees.length,
        month,
        year,
    });
}));
// DELETE service charge
admin.delete('/service-charges/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = c.req.param('id');
    const user = c.get('user');
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = yield supabase.from('ServiceCharge').delete().eq('id', id);
    if (error)
        return c.json({ error: error.message }, 500);
    yield logger_1.SystemLogger.logAction(user.userId, user.role, 'SERVICE_CHARGE_DELETED', id, undefined, c.env);
    return c.json({ message: 'Service charge deleted' });
}));
exports.default = admin;
