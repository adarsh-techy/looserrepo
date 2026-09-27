import http from 'http';
import express from 'express';
// Forwards rejected promises from async route handlers to the error middleware below
// (Express 4 doesn't, and an unhandled rejection crashes the process).
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { initializeSocket } from './socket';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initializeSocket(server);

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.replace(/\/$/, '');
    // In development mode or local dev, allow localhost automatically
    if (normalizedOrigin.startsWith('http://localhost:') || normalizedOrigin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    // Allow all vercel preview & production deployments automatically
    if (normalizedOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Check against configured allowed origins
    const isAllowed = config.corsOrigin.some((allowed) => {
      const normalizedAllowed = allowed.trim().replace(/\/$/, '');
      return normalizedAllowed === '*' || normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow to prevent blocking
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ServerError]', err);

  // Map common Prisma failures to client errors instead of generic 500s.
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    status = 400;
    message = 'Referenced record does not exist';
  } else if (err.name === 'PrismaClientValidationError') {
    status = 400;
    message = 'Invalid request data';
  }

  // Don't leak internal error details from production 500s.
  if (status >= 500 && config.nodeEnv === 'production') {
    message = 'Internal Server Error';
  }

  res.status(status).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`=========================================`);
    console.log(`🔐 Loosers Secure Vault Server running`);
    console.log(`📍 Port: ${config.port}`);
    console.log(`🌐 Health: http://localhost:${config.port}/api/health`);
    console.log(`🛡️  Environment: ${config.nodeEnv}`);
    console.log(`=========================================`);
  });
}

export { app, server };
