FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/kafka-worker ./apps/kafka-worker
RUN npm install
RUN npx tsc -b apps/kafka-worker

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/kafka-worker/dist ./apps/kafka-worker/dist
COPY --from=builder /app/packages ./packages

CMD ["node", "apps/kafka-worker/dist/index.js"]
