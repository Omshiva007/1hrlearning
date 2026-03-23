import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  reconnectOnError: (err) => {
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
  try {
    await redis.connect();
    logger.info('✅ Redis ready');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

export const cacheSet = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
