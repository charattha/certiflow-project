import { z } from 'zod';
import { Context, Next } from 'hono';

export const validateRequest = (schema: z.ZodObject<any, any>) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const query = c.req.query();
      const params = c.req.param();

      await schema.parseAsync({
        body,
        query,
        params,
      });
      return next();
    } catch (error) {
      return c.json({
        success: false,
        message: 'Validation failed',
        errors: error instanceof z.ZodError ? error.format() : error,
      }, 400);
    }
  };
};

// Common Schemas
export const schemas = {
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    })
  }),
  registerAdmin: z.object({
    body: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    })
  }),
  registerEmployee: z.object({
    body: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      department: z.string().optional(),
    })
  }),
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    })
  })
};
