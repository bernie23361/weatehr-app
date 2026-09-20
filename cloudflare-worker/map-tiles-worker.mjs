// Serves self-hosted map tiles from R2 with Cloudflare edge caching.
//
// Tiles are immutable, so the first request for a tile warms the edge cache and
// every later request is served from cache without touching R2 — keeping R2
// Class B reads flat as user count grows. (Egress from R2 is free.)
//
// Object keys mirror the local layout: `base/{z}/{x}/{y}.pbf`,
// `terrain/{z}/{x}/{y}.png`.

const CONTENT_TYPES = {
  pbf: 'application/x-protobuf',
  png: 'image/png',
};

const ALLOWED_PREFIX = /^(base|terrain)\//;

/** Return a copy of `response` with `X-Cache` set — for cache-hit debugging. */
function withCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache', status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

    if (!ALLOWED_PREFIX.test(key)) {
      return new Response('Not found', { status: 404 });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return withCacheStatus(cached, 'HIT');

    const object = await env.MAP_TILES.get(key);
    if (!object) return new Response('Not found', { status: 404 });

    const ext = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
    const headers = new Headers();
    headers.set('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');

    const response = new Response(object.body, { headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return withCacheStatus(response, 'MISS');
  },
};
