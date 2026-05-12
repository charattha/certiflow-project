import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employee';
import adminRoutes from './routes/admin';

import { errorHandler } from './middleware/errorHandler';

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    NODE_ENV: string;
  }
}>();

// Middlewares
app.use('*', logger());
app.use('*', secureHeaders());

app.use('*', async (c, next) => {
  const allowedOrigins = (c.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsMiddleware = cors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  return corsMiddleware(c, next);
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/employee', employeeRoutes);
app.route('/api/admin', adminRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'certiflow-worker', 
    timestamp: new Date().toISOString() 
  });
});

// Error Handling
app.onError(errorHandler);

export default app;
