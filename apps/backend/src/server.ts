import 'dotenv/config';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './utils/prisma';
import { connectRedis, disconnectRedis } from './utils/redis';
import { globalRateLimit } from './middleware/rateLimit';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import { createSocketServer } from './socket';

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    tracesSampleRate: config.isProd ? 0.1 : 1.0,
  });
}

const app = express();
const httpServer = http.createServer(app);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.isProd,
  }),
);

app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );
}

app.use(globalRateLimit);

app.use('/api/v1', apiRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: '1hrLearning API',
    version: '1.0.0',
    status: 'ok',
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const io = createSocketServer(httpServer);
app.set('io', io);

async function start(): Promise<void> {
  try {
    await Promise.all([connectDatabase(), connectRedis()]);

    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} (${config.env})`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  httpServer.close(async () => {
    await Promise.all([disconnectDatabase(), disconnectRedis()]);
    logger.info('Server shut down');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

start();

export { app, httpServer, io };
