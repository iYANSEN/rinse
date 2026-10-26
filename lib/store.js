// Tiny key/value store for hosted gallery links. Values are strings (JSON or base64).
//   Upstash Redis REST (recommended on Vercel: free tier, 2 env vars)  -> UPSTASH_REDIS_REST_URL / _TOKEN  (Vercel KV names also work)
//   Local disk (dev)                                                    -> ./data  (or DATA_DIR)
//   Vercel without a database                                           -> /tmp, which is temporary: links die when the function recycles.
const fs = require('fs'), path = require('path');
const TTL = (Number(process.env.SHARE_TTL_DAYS) || 180) * 86400;
let cached;

function upstash(url, token) {
  const cmd = async (args) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error('store ' + r.status);
    const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
  };
  return { kind: 'upstash', persistent: true, put: (k, v) => cmd(['SET', k, v, 'EX', TTL]), get: async (k) => (await cmd(['GET', k])) || null };
}
function disk(dir, persistent) {
  const f = (k) => path.join(dir, k.replace(/[^a-zA-Z0-9_.-]/g, '_'));
  fs.mkdirSync(dir, { recursive: true });
  return { kind: persistent ? 'disk' : 'tmp', persistent, put: async (k, v) => { fs.writeFileSync(f(k), v); }, get: async (k) => { try { return fs.readFileSync(f(k), 'utf8'); } catch (e) { return null; } } };
}
module.exports = function store() {
  if (cached) return cached;
  const e = process.env, url = e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL, token = e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN;
  if (url && token) return (cached = upstash(url.replace(/\/$/, ''), token));
  if (e.VERCEL) return (cached = disk('/tmp/rinse-shares', false));
  return (cached = disk(e.DATA_DIR || path.join(__dirname, '..', 'data'), true));
};
