# ──────────────────────────────────────────────────────────────────
# Dockerfile — Frontend (React / Vite)
#
# BUILD:
#   docker build -t mini-bi-frontend .
#
# RUN (standalone):
#   docker run -p 80:80 mini-bi-frontend
#
# VPS DEPLOY (after docker-compose up):
#   Nginx serves the built SPA on port 80.
#   Make sure your VPS firewall opens ports 80 and 443.
#   For HTTPS: mount Let's Encrypt certs into the Nginx container.
# ──────────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first to leverage Docker layer cache
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build
# Output: /app/dist


# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS production

# Remove default Nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing (client-side routes → index.html)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  gzip on; \
  gzip_types text/plain text/css application/javascript application/json; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
