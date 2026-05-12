# 1. Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp and Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for TypeScript)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# 2. Production stage
FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma in production
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# We copy all dependencies from the builder so ts-node and @types are available for staging/seeding
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Install tsx to handle TS execution more robustly than ts-node in Node 20
RUN npm install -g tsx

# Expose port
EXPOSE 3001

# Command to run (we'll run migrations and start the server)
# Note: In a real prod environment, db push should be handled carefully via migrations.
# For Phase 1, we push schema and seed the DB on startup.
CMD npx prisma db push && tsx prisma/seed.ts && node dist/index.js
