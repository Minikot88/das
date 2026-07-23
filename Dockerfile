FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder

WORKDIR /app

ARG VITE_USE_MOCK=true
ARG VITE_API_BASE_URL=
ARG VITE_API_TIMEOUT_MS=15000
ENV VITE_USE_MOCK=${VITE_USE_MOCK}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run lint \
    && npm run typecheck \
    && VITE_USE_MOCK=true npm test -- --run \
    && npm audit \
    && npm run audit:prod
RUN npm run build

FROM nginx:stable-alpine@sha256:0d3b80406a13a767339fbe2f41406d6c7da727ab89cf8fae399e81f780f814d1 AS production

RUN apk upgrade --no-cache \
    && rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run/nginx.pid /etc/nginx/conf.d
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
