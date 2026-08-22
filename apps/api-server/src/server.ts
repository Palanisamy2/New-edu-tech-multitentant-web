import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import { tenantResolver } from './core/middleware/tenant-resolver.middleware';
import { config } from './config';

// Route Imports
import { authRouter } from './modules/auth/auth.controller';
import { courseRouter } from './modules/courses/course.controller';
import { financeRouter } from './modules/finance/finance.controller';
import { superAdminRouter } from './modules/super-admin/super-admin.controller';
import { trainerRouter } from './modules/trainer/trainer.controller';
import { studentRouter } from './modules/student/student.controller';
import { userRouter } from './modules/users/user.controller';
import { webhookRouter } from './modules/webhooks/webhook.controller';
import { systemRouter } from './modules/system/system.controller';

const app = express();

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in an hour.' }
});

// Global Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000'];
      
    const isAllowed = allowedOrigins.includes(origin) || 
      /^https?:\/\/([a-z0-9_-]+\.)?localhost:3000$/.test(origin);
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(globalLimiter);

// Webhook raw body parsing (MUST come before express.json)
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json());

// Apply specific limiter to auth
app.use('/api/v1/auth/login', authLimiter);

// Multi-Tenant Middleware
app.use(tenantResolver);

// Register Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/super-admin', superAdminRouter);
app.use('/api/v1/trainer', trainerRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/system', systemRouter);

// Global Error handling middleware


// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const tenant = req.headers['x-tenant-slug'] || 'public';

  console.error(`🔴 [Error] [${tenant}] [${req.method} ${req.path}]:`, err);

  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      tenant
    }
  });
});

const server = app.listen(config.port, () => {
  console.log(`🚀 API Server running on port ${config.port}`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  server.close(async () => {
    console.log('📡 HTTP server closed.');
    const { getPool } = await import('@genyuga/database');
    await getPool().destroy();
    console.log('🗄️ Database pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
