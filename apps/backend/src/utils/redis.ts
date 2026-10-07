import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisAvailable = false;
export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  reconnectOnError: (err) => {
    // READONLY commonly indicates a managed Redis failover; reconnect so the client discovers the writer.
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<void> {
  // Mark availability optimistically so successful connection immediately enables cache helpers.
    redisAvailable = true;
  try {
    await redis.connect();
    logger.info('✅ Redis ready');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    redisAvailable = false;
    // Cache is optional during local development but required infrastructure in production.
    if (config.isProd) throw error;
    logger.warn('Redis unavailable; continuing without cache in development');
    redis.disconnect();
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = redisAvailable ? await redis.get(key).catch(() => null) : null;
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    // Treat malformed or legacy cache entries as misses; the authoritative database will repopulate them.
    return null;
  }
};

export const cacheSet = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  if (!redisAvailable) return;
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
  if (redisAvailable && keys.length > 0) {
    await redis.del(...keys);
  }
};
