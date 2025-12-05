# ---------- STAGE 1: Build frontend ----------
FROM node:18-bullseye AS builder

WORKDIR /app

# Copy client + server + data into build stage
COPY client ./client
COPY server ./server
COPY data ./data

# Install frontend dependencies & build UI
WORKDIR /app/client
RUN npm install
RUN npm run build

# ---------- STAGE 2: Production Server ----------
FROM node:18-bullseye

WORKDIR /app

# Copy backend code
COPY server ./server

# Copy built frontend into server/public
COPY --from=builder /app/client/dist ./server/public

# Copy SQLite data folder
COPY --from=builder /app/data ./data

# Install backend dependencies (only production)
WORKDIR /app/server
RUN npm install --production

# Let Railway set PORT, your app should use process.env.PORT || 8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
