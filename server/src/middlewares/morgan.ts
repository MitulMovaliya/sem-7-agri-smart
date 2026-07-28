import morgan from 'morgan';
import logger from '../utils/logger.js';

// Stream to pipe morgan output to winston's http level
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// Disable logging in test environment
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'test';
};

// Build the morgan middleware
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default morganMiddleware;
