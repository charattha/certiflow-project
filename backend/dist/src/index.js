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
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const secure_headers_1 = require("hono/secure-headers");
const logger_1 = require("hono/logger");
const auth_1 = __importDefault(require("./routes/auth"));
const employee_1 = __importDefault(require("./routes/employee"));
const admin_1 = __importDefault(require("./routes/admin"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = new hono_1.Hono();
// Middlewares
app.use('*', (0, logger_1.logger)());
app.use('*', (0, secure_headers_1.secureHeaders)());
app.use('*', (c, next) => __awaiter(void 0, void 0, void 0, function* () {
    const allowedOrigins = (c.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    const corsMiddleware = (0, cors_1.cors)({
        origin: allowedOrigins,
        credentials: true,
    });
    return corsMiddleware(c, next);
}));
// Routes
app.route('/api/auth', auth_1.default);
app.route('/api/employee', employee_1.default);
app.route('/api/admin', admin_1.default);
// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        service: 'certiflow-worker',
        timestamp: new Date().toISOString()
    });
});
// Error Handling
app.onError(errorHandler_1.errorHandler);
exports.default = app;
