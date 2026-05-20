# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# ---- Runtime image ----
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy only what we need
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
