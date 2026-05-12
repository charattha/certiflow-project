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
exports.badRequestLimiter = exports.badRequestLimiterMem = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
// 20 bad requests allowed per IP per 1 hour
exports.badRequestLimiterMem = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 20,
    duration: 60 * 60, // 1 hour
});
/**
 * Middleware that intercepts all requests:
 * 1. Pre-check: If IP is already blocked due to too many 400s, return 429 immediately.
 * 2. Post-check: Listen to the response finishing, if status is 400, consume a point.
 */
const badRequestLimiter = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Pre-check barrier
        const resLimiter = yield exports.badRequestLimiterMem.get(req.ip || '');
        if (resLimiter !== null && resLimiter.consumedPoints > exports.badRequestLimiterMem.points) {
            return res.status(429).json({
                error: 'Too Many Bad Requests. Your IP has been temporarily blocked for 1 hour.'
            });
        }
    }
    catch (err) {
        // RateLimiterMemory.get doesn't throw on reject, but general error safety
        console.error('Error checking badRequestLimiterMem', err);
    }
    // 2. Intercept response finish
    res.on('finish', () => __awaiter(void 0, void 0, void 0, function* () {
        if (res.statusCode === 400) {
            try {
                yield exports.badRequestLimiterMem.consume(req.ip || '');
            }
            catch (rateLimiterRes) {
                // Point consumed, limit exceeded, no action needed here as it will block on NEXT request
            }
        }
    }));
    next();
});
exports.badRequestLimiter = badRequestLimiter;
