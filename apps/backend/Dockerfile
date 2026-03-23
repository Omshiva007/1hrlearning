FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
RUN cd apps/backend && npm ci --only=production

FROM base AS builder
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/server.js"]
