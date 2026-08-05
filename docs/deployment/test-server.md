# Test Server Deployment

The deployment contract remains rooted at `Dockerfile`, `docker-compose.yml`, and `nginx.conf`.

```bash
docker compose up --build
```

Open `http://127.0.0.1:8080` and verify `http://127.0.0.1:8080/healthz` returns `ok`. The nginx configuration retains SPA fallback, immutable caching for hashed assets, security headers, same-origin frame policy, and explicit `503` responses for `/api`.

For a deployment smoke test:

1. Build the image and wait for the container health check.
2. Open `/dashboard-v2`, `/share/<id>`, `/dashboard/<id>/view`, and `/dashboard/<id>/embed` directly to verify SPA fallback; legacy `/login` and `/register` must redirect to `/dashboard-v2`.
3. Exercise the protected routes after login.
4. Restart the container and confirm the frontend still loads. Browser local data remains on the client and is not stored in the container.

The refactor does not change ports, build arguments, environment names, health paths, or nginx routing.
