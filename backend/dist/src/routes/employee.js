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
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const document_1 = require("../services/document");
const supabase_1 = require("../utils/supabase");
const employee = new hono_1.Hono();
employee.use('*', auth_1.authenticateToken);
employee.get('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const employeeId = user.employeeId;
    if (!employeeId)
        return c.json({ error: 'User is not linked to an employee profile' }, 403);
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = yield supabase
        .from('DocumentRequest')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    if (error)
        return c.json({ error: error.message }, 500);
    return c.json(data);
}));
const documentRequestSchema = zod_1.z.object({
    doc_type: zod_1.z.enum(['salary_cert', 'emp_cert', 'visa_letter']), // payslip_copy, tax_50: TODO not yet implemented
    doc_lang: zod_1.z.enum(['TH', 'EN']),
    reason: zod_1.z.enum(['financial', 'visa', 'education', 'other']),
    // User-supplied template overrides (prefix, employment_date, last_working_date)
    template_fields: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    // Visa-only fields
    country_prefer_travel: zod_1.z.string().optional(),
    departure_date: zod_1.z.string().optional(),
    last_travel_date: zod_1.z.string().optional(),
    arrival_date: zod_1.z.string().optional(),
    on_duty_date: zod_1.z.string().optional(),
});
employee.post('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const employeeId = user.employeeId;
    if (!employeeId)
        return c.json({ error: 'User is not linked to an employee profile' }, 403);
    const body = yield c.req.json();
    const result = documentRequestSchema.safeParse(body);
    if (!result.success)
        return c.json({ error: 'Invalid request data', details: result.error.format() }, 400);
    const { doc_type, doc_lang, reason, template_fields, country_prefer_travel, departure_date, last_travel_date, arrival_date, on_duty_date } = result.data;
    if (doc_type === 'visa_letter') {
        if (!country_prefer_travel || !departure_date || !last_travel_date || !arrival_date || !on_duty_date) {
            return c.json({ error: 'Visa letter requires: country_prefer_travel, departure_date, last_travel_date, arrival_date, on_duty_date' }, 400);
        }
    }
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    // Cooldown: one request per doc_type every 7 days
    const cooldownSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReq } = yield supabase
        .from('DocumentRequest')
        .select('created_at')
        .eq('employee_id', employeeId)
        .eq('doc_type', doc_type)
        .gte('created_at', cooldownSince)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (recentReq) {
        const nextAvailable = new Date(new Date(recentReq.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
        return c.json({ error: 'cooldown', next_available: nextAvailable.toISOString() }, 429);
    }
    const { count } = yield supabase
        .from('DocumentRequest')
        .select('*', { count: 'exact', head: true });
    const request_id = `REQ-${((count !== null && count !== void 0 ? count : 0) + 1).toString().padStart(3, '0')}`;
    const { data: newRequest, error } = yield supabase
        .from('DocumentRequest')
        .insert({
        id: crypto.randomUUID(),
        request_id,
        doc_type,
        doc_lang,
        reason,
        employee_id: employeeId,
        template_fields: template_fields !== null && template_fields !== void 0 ? template_fields : null,
        country_prefer_travel: country_prefer_travel !== null && country_prefer_travel !== void 0 ? country_prefer_travel : null,
        departure_date: departure_date !== null && departure_date !== void 0 ? departure_date : null,
        last_travel_date: last_travel_date !== null && last_travel_date !== void 0 ? last_travel_date : null,
        arrival_date: arrival_date !== null && arrival_date !== void 0 ? arrival_date : null,
        on_duty_date: on_duty_date !== null && on_duty_date !== void 0 ? on_duty_date : null,
        updated_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        console.error('[POST /requests] Insert error:', JSON.stringify(error));
        return c.json({ error: error.message }, 500);
    }
    c.executionCtx.waitUntil((0, document_1.triggerDocumentGeneration)(newRequest.id, c.env));
    return c.json(newRequest, 201);
}));
employee.get('/downloads/:requestId', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = c.req.param('requestId');
    const user = c.get('user');
    const employeeId = user.employeeId;
    const supabase = (0, supabase_1.getSupabase)(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: request } = yield supabase
        .from('DocumentRequest')
        .select('file_url, employee_id, status')
        .eq('id', requestId)
        .maybeSingle();
    if (!request)
        return c.json({ error: 'Request not found' }, 404);
    if (request.employee_id !== employeeId)
        return c.json({ error: 'Forbidden' }, 403);
    if (request.status === 'PENDING' || !request.file_url)
        return c.json({ error: 'Document not ready' }, 404);
    return c.json({ url: request.file_url });
}));
exports.default = employee;
