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
exports.schemas = exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error instanceof zod_1.z.ZodError ? error.format() : error,
            });
        }
    });
};
exports.validateRequest = validateRequest;
// Common Schemas
exports.schemas = {
    login: zod_1.z.object({
        body: zod_1.z.object({
            email: zod_1.z.string().email('Invalid email address'),
            password: zod_1.z.string().min(1, 'Password is required'),
        })
    }),
    registerAdmin: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
            email: zod_1.z.string().email('Invalid email address'),
            password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        })
    }),
    registerEmployee: zod_1.z.object({
        body: zod_1.z.object({
            name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
            email: zod_1.z.string().email('Invalid email address'),
            password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
            department: zod_1.z.string().optional(),
        })
    })
};
