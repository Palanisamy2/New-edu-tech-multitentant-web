import pino from 'pino';
import { getTenantSlug } from '@genyuga/shared-context';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
  } : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
  mixin() {
    return {
      tenant: getTenantSlug() || 'public',
    };
  },
});
