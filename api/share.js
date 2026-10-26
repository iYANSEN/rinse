// POST /api/share  { op: 'create' | 'img' | 'done', ... }  -> hosted before/after gallery at /g/:id
// Three small requests (not one giant upload) so it fits serverless body limits and can resume after a bad signal.
//   create { id?, token?, meta }        -> { id, token?, rev, url }   (id+token present = update the same link)
//   img    { id, token, rev, key, data } -> { ok }                     key: a0,b0,a1,b1,...,logo ; data: JPEG/PNG data URL
//   done   { id, token, rev }           -> { ok, url }                 flips the link to the new revision once every image arrived
const crypto = require('crypto'), store = require('../lib/store'), G = require('../gallery-template');
const hits = new Map();
function limited(ip, bucket, max) {
  const k = bucket + ip, now = Date.now(), h = (hits.get(k) || []).filter((t) => now - t < 3600e3);
  if (h.length >= max) return true; h.push(now); hits.set(k, h); return false;
}
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const origin = (req) => process.env.PUBLIC_URL || ((req.headers['x-forwarded-proto'] || 'http').split(',')[0] + '://' + (req.headers['x-forwarded-host'] || req.headers.host));
const KEY = /^(?:[ab]\d{1,2}|logo)$/;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const send = (c, o) => { res.statusCode = c; res.end(JSON.stringify(o)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  const b = req.body; if (!b || typeof b !== 'object') return send(400, { error: 'bad_body' });
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x').split(',')[0].trim(), S = store();
  try {
    if (b.op === 'create') {
      if (limited(ip, 'c', 30)) return send(429, { error: 'rate_limited' });
      const m = b.meta || {}, pairs = Array.isArray(m.pairs) ? m.pairs.slice(0, 30) : [];
      if (!pairs.length) return send(400, { error: 'no_pairs' });
      let id = b.id, token = b.token, fresh = false;
      if (id) { if (!/^[\w-]{6,32}$/.test(id) || sha(token) !== await S.get('s:' + id + ':auth')) return send(403, { error: 'bad_token' }); }
      else { id = crypto.randomBytes(8).toString('base64url'); token = crypto.randomBytes(18).toString('base64url'); fresh = true; await S.put('s:' + id + ':auth', sha(token)); }
      const rev = Date.now().toString(36);
      const meta = { id, rev, title: str(m.title, 120), address: str(m.address, 160), date: str(m.date, 40), message: str(m.message, 600), business: str(m.business, 80), phone: str(m.phone, 30), contact: str(m.contact, 160),
        color: G.safeColor(m.color), review: G.safeHttps(str(m.review, 300)), hasLogo: !!m.hasLogo, pairs: pairs.map((p, i) => ({ k: String(i), cap: str(p && p.cap, 80) })), created: new Date().toISOString() };
      await S.put('s:' + id + ':m:' + rev, JSON.stringify(meta));
      return send(200, { id, rev, token: fresh ? token : undefined, url: origin(req) + '/g/' + id });
    }
    if (b.op === 'img') {
      if (limited(ip, 'i', 900)) return send(429, { error: 'rate_limited' });
      if (!/^[\w-]{6,32}$/.test(b.id || '') || sha(b.token) !== await S.get('s:' + b.id + ':auth')) return send(403, { error: 'bad_token' });
      const mm = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=]+)$/.exec(b.data || '');
      if (!mm || !KEY.test(b.key || '') || !/^[a-z0-9]{4,12}$/.test(b.rev || '') || b.data.length > 1.2e6) return send(400, { error: 'bad_image' });
      await S.put('s:' + b.id + ':i:' + b.rev + ':' + b.key, mm[1] + '|' + mm[2]);
      return send(200, { ok: true });
    }
    if (b.op === 'done') {
      if (limited(ip, 'd', 60)) return send(429, { error: 'rate_limited' });
      if (!/^[\w-]{6,32}$/.test(b.id || '') || sha(b.token) !== await S.get('s:' + b.id + ':auth')) return send(403, { error: 'bad_token' });
      const raw = /^[a-z0-9]{4,12}$/.test(b.rev || '') && await S.get('s:' + b.id + ':m:' + b.rev); if (!raw) return send(404, { error: 'unknown_rev' });
      const meta = JSON.parse(raw), keys = [].concat.apply([], meta.pairs.map((p) => ['a' + p.k, 'b' + p.k])).concat(meta.hasLogo ? ['logo'] : []);
      const have = await Promise.all(keys.map((k) => S.get('s:' + b.id + ':i:' + b.rev + ':' + k))), missing = keys.filter((k, i) => !have[i]);
      if (missing.length) return send(409, { error: 'missing_images', missing });
      await S.put('s:' + b.id + ':meta', raw);
      return send(200, { ok: true, url: origin(req) + '/g/' + b.id });
    }
    send(400, { error: 'unknown_op' });
  } catch (e) { send(500, { error: 'store_error' }); }
};
