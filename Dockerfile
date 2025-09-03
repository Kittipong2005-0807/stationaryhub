FROM node:23-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
COPY next.config.js ./next.config.js
RUN npm install
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD curl -f http://localhost:3000/ || exit 1
CMD ["npm", "run", "start"]
 