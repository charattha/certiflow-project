"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
const employee_1 = __importDefault(require("./routes/employee"));
const admin_1 = __importDefault(require("./routes/admin"));
const errorHandler_1 = require("./middleware/errorHandler");
const badRequestLimiter_1 = require("./middleware/badRequestLimiter");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Base Middlewares
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Security Middlewares Layer
app.use((0, helmet_1.default)());
app.use(badRequestLimiter_1.badRequestLimiter);
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
}));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/employee', employee_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'certipaws-backend', timestamp: new Date().toISOString() });
});
// Global Error Handler must be the last middleware
app.use(errorHandler_1.errorHandler);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
