import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Link colors to Winston
winston.addColors(colors);

// Custom format for clean console output
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  // Tell Winston to colorize logs
  winston.format.colorize({ all: true }),
  // Define format structure
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      let logStr = `[${timestamp}] [${level}]: ${message}`;
      
      // If there is an error stack trace, append it
      if (meta.stack) {
        logStr += `\n${meta.stack}`;
      } else if (Object.keys(meta).length > 0) {
        logStr += ` ${JSON.stringify(meta, (_key, value) => {
          if (value instanceof Error) {
            return { message: value.message, name: value.name, stack: value.stack };
          }
          return value;
        })}`;
      }
      
      return logStr;
    }
  )
);

// Define which level to log based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
};

// Only Console transport is registered, as we do not want to save logs in files
const transports = [
  new winston.transports.Console(),
];

// Create the logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format,
  transports,
});

export default logger;
