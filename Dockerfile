# Frontend-only production image for the Dashboard Mini BI Vite app.

FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_USE_MOCK=true
ARG VITE_API_BASE_URL=
ARG VITE_API_TIMEOUT_MS=15000
ENV VITE_USE_MOCK=${VITE_USE_MOCK}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine AS production

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '  gzip on;' \
  '  gzip_types text/plain text/css application/javascript application/json image/svg+xml;' \
  '  add_header X-Content-Type-Options nosniff always;' \
  '  add_header Referrer-Policy strict-origin-when-cross-origin always;' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
