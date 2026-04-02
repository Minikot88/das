/**
 * queryCache.js
 * In-memory cache layer simulating Redis caching behavior.
 * In production: replace getCached/setCached with axios calls to /api/cache (backed by Redis).
 *
 * DOCKER DEPLOY NOTE:
 *   Redis service in docker-compose.yml maps to backend cache client.
 *   Frontend would POST to /api/query, backend checks Redis before hitting PostgreSQL.
 */

const _cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes
let _lastQueryResult = null;

export function buildCacheKey(params) {
  return JSON.stringify(params);
}

export function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key, value) {
  _cache.set(key, { value, cachedAt: Date.now(), expiresAt: Date.now() + TTL_MS });
}

export function setLastQueryResult(result) {
  _lastQueryResult = {
    ...result,
    cachedAt: Date.now(),
  };
}

export function getLastQueryResult() {
  return _lastQueryResult;
}

export function invalidateCache(key) {
  _cache.delete(key);
}

export function clearCache() {
  _cache.clear();
  _lastQueryResult = null;
}

export function getCacheStats() {
  return { size: _cache.size, keys: [..._cache.keys()] };
}
