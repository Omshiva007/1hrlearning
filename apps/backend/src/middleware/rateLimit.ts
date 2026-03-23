import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../utils/redis';
import { config } from '../config';

type RedisReply = boolean | number | string | (boolean | number | string)[];

const makeStore = () =>
  new RedisStore({
    sendCommand: ((...args: string[]) =>
      redis.call(args[0], ...args.slice(1))) as unknown as (...args: string[]) => Promise<RedisReply>,
  });

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: config.isProd ? makeStore() : undefined,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: config.isProd ? makeStore() : undefined,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: config.isProd ? makeStore() : undefined,
  message: { success: false, message: 'Rate limit exceeded, please slow down.' },
});
