import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employee';
import adminRoutes from './routes/admin';

import { errorHandler } from './middleware/errorHandler';
import { badRequestLimiter } from './middleware/badRequestLimiter';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust reverse proxy (Railway / Render / Cloudflare)
// Required for accurate IP rate-limiting and secure cookie handling
app.set('trust proxy', 1);

// Build allowed origins list from comma-separated FRONTEND_URL env var
// e.g., FRONTEND_URL="https://certiflow.pages.dev,https://preview.certiflow.pages.dev"
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Base Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // Cap payload size to prevent DoS
app.use(cookieParser());

// Security Middlewares Layer
app.use(helmet()); 
app.use(badRequestLimiter);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, 
    legacyHeaders: false, 
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'certipaws-backend', timestamp: new Date().toISOString() });
});

// Global Error Handler must be the last middleware
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connections closed. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
