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
const templateFields_1 = require("../utils/templateFields");
const prisma_1 = require("../utils/prisma");
const employee = new hono_1.Hono();
employee.use('*', auth_1.authenticateToken);
employee.get('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const employeeId = user.employeeId;
    if (!employeeId) {
        return c.json({ error: 'User is not linked to an employee profile' }, 403);
    }
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const requests = yield prisma.documentRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
    });
    return c.json(requests);
}));
employee.get('/template-fields/:docType', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const docType = c.req.param('docType');
    const fields = templateFields_1.TEMPLATE_FIELD_DEFINITIONS[docType];
    if (fields === undefined) {
        return c.json({ error: 'Unknown document type' }, 404);
    }
    return c.json(fields);
}));
const documentRequestSchema = zod_1.z.object({
    docType: zod_1.z.enum(['salary_cert', 'payslip_copy', 'tax_50', 'emp_cert', 'visa_letter']),
    docLang: zod_1.z.enum(['TH', 'EN']),
    reason: zod_1.z.enum(['financial', 'visa', 'education', 'other']),
    templateFields: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
employee.post('/requests', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const user = c.get('user');
    const employeeId = user.employeeId;
    if (!employeeId) {
        return c.json({ error: 'User is not linked to an employee profile' }, 403);
    }
    const body = yield c.req.json();
    const result = documentRequestSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: 'Invalid request data', details: result.error.format() }, 400);
    }
    const { docType, docLang, reason, templateFields } = result.data;
    const fieldDefs = templateFields_1.TEMPLATE_FIELD_DEFINITIONS[docType] || [];
    const requiredUserFields = fieldDefs.filter((f) => !f.autoFilled && f.required);
    const missingFields = requiredUserFields.filter((f) => !(templateFields === null || templateFields === void 0 ? void 0 : templateFields[f.key]));
    if (missingFields.length > 0) {
        return c.json({
            error: 'Missing required template fields',
            missingFields: missingFields.map((f) => ({ key: f.key, label: f.label })),
        }, 400);
    }
    const prisma = (0, prisma_1.getPrisma)(c.env.DATABASE_URL);
    const count = yield prisma.documentRequest.count();
    const requestId = `REQ-${(count + 1).toString().padStart(3, '0')}`;
    // Requested -> routed to HR: the request is created PENDING and stays there
    // until HR issues the physical document (see admin.ts POST /requests/:id/issue).
    const newRequest = yield prisma.documentRequest.create({
        data: {
            requestId,
            docType,
            docLang,
            reason,
            employeeId,
            templateFields: templateFields || {},
        },
    });
    return c.json(newRequest, 201);
}));
exports.default = employee;
