"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
// Global error handler
const errorHandler = (err, req, res, next) => {
    console.error('[Error Handler]:', err.message);
    // Expose stack trace only in development, NOT in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json(Object.assign({ success: false, message: err.message || 'Internal Server Error' }, (isDevelopment && { stack: err.stack })));
};
exports.errorHandler = errorHandler;
// Async wrapper to eliminate try-catch boilerplate in route controllers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
