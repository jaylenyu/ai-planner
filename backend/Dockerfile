# Stage 1: Production dependencies
FROM node:22-alpine AS deps
WORKDIR /app
# openssl이 없으면 Prisma가 OpenSSL 1.1 엔진을 받아 런타임(OpenSSL 3)에서 쓰지 못함
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=128"

RUN apk add --no-cache openssl \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001 \
 && chown nodejs:nodejs /app

# chown -R은 /app 전체를 새 레이어로 복제하므로 COPY --chown으로 소유자를 지정
# prisma CLI는 @prisma/client 의존성으로 deps 단계에 이미 설치됨
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
USER nodejs

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/src/main.js"]
