# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY index.html vite.config.js ./

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app
RUN npm install -g http-server

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["http-server", "dist", "-p", "5173", "-c-1"]
