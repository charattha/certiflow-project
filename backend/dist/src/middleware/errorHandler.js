"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, c) => {
    console.error('[Error Handler]:', err.message);
    const isDevelopment = c.env.NODE_ENV === 'development';
    return c.json(Object.assign({ success: false, message: isDevelopment ? err.message : 'Internal Server Error' }, (isDevelopment && { stack: err.stack })), 500);
};
exports.errorHandler = errorHandler;
