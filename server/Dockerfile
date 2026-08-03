# Multi-stage Dockerfile for Express Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy tsconfig and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JS (outputs to /app/build)
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/build ./build

# Create directory for uploads static files
RUN mkdir -p public/uploads

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "build/server.js"]
