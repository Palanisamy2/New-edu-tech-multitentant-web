FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api-server ./apps/api-server
RUN npm install
RUN npx tsc -b apps/api-server

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-server/dist ./apps/api-server/dist
COPY --from=builder /app/packages ./packages

EXPOSE 4000
CMD ["node", "apps/api-server/dist/server.js"]
