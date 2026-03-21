import winston from 'winston';
import { config } from '../config/index.js';

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => {
        if (/api[-_]?key|authorization|token|secret|password/i.test(key)) {
          return [key, '[REDACTED]'];
        }
        return [key, sanitizeValue(entryValue)];
      })
    );
  }

  if (typeof value === 'string' && /(gsk_|AIza|sk-)/.test(value)) {
    return '[REDACTED]';
  }

  return value;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    const sanitizedMeta = sanitizeValue(meta);
    if (sanitizedMeta && typeof sanitizedMeta === 'object' && Object.keys(sanitizedMeta as Record<string, unknown>).length > 0) {
      log += ` ${JSON.stringify(sanitizedMeta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Log unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
