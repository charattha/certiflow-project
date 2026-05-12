import { Context } from 'hono';

export const errorHandler = (err: Error, c: Context) => {
  console.error('[Error Handler]:', err.message);
  
  const isDevelopment = c.env.NODE_ENV === 'development';
  
  return c.json({
    success: false,
    message: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  }, 500);
};
