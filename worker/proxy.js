/**
 * CLOUDFLARE WORKER API PROXY FOR CLAUDE & KIRO
 * Keeps API Keys server-side, enforces CORS & optional X-App-Token protection.
 */
export default {
  async fetch(request, env) {
    const ALLOWED = 'https://bb99kra.github.io';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Token',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Optional App Token verification
    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid X-App-Token' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const targetBase = env.TARGET_API_BASE || 'https://api.9kiro.lol/v1';
    const targetUrl = targetBase + url.pathname + url.search;

    const headers = new Headers(request.headers);
    if (env.API_KEY) {
      headers.set('Authorization', `Bearer ${env.API_KEY}`);
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null
      });

      const responseHeaders = new Headers(response.headers);
      Object.keys(cors).forEach(k => responseHeaders.set(k, cors[k]));

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }
};
