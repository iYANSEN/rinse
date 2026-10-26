// GET /g/:id  -> the client's gallery page      GET /g/:id/:rev.:key.jpg -> one image   (vercel.json / server.js rewrite to this file)
const store = require('../lib/store'), G = require('../gallery-template');
module.exports = async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, id = q.get('id') || '', f = q.get('f') || '', S = store();
  const fail = (c, t) => { res.statusCode = c; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 20px;color:#222"><h1 style="font-size:1.4rem">' + t + '</h1><p style="color:#6a6a6a">Ask the business to send the link again.</p>'); };
  if (!/^[\w-]{6,32}$/.test(id)) return fail(404, 'Gallery not found');
  try {
    if (f) {
      const m = /^([a-z0-9]{4,12})\.((?:[ab]\d{1,2})|logo)\.(?:jpg|png)$/.exec(f); if (!m) return fail(404, 'Not found');
      const v = await S.get('s:' + id + ':i:' + m[1] + ':' + m[2]); if (!v) return fail(404, 'Not found');
      const i = v.indexOf('|'); res.setHeader('Content-Type', v.slice(0, i)); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.setHeader('X-Robots-Tag', 'noindex');
      return res.end(Buffer.from(v.slice(i + 1), 'base64'));
    }
    const raw = await S.get('s:' + id + ':meta'); if (!raw) return fail(404, 'Gallery not found');
    const m = JSON.parse(raw), base = '/g/' + id + '/' + m.rev + '.', proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0], host = req.headers['x-forwarded-host'] || req.headers.host, abs = process.env.PUBLIC_URL || (proto + '://' + host);
    const html = G.render({ title: m.title, address: m.address, date: m.date, message: m.message, business: m.business, phone: m.phone, contact: m.contact, color: m.color, review: m.review,
      logo: m.hasLogo ? base + 'logo.jpg' : '', pairs: m.pairs.map((p) => ({ b: base + 'b' + p.k + '.jpg', a: base + 'a' + p.k + '.jpg', cap: p.cap })) },
      { fontUrl: '/fonts/figtree.woff2', og: { url: abs + '/g/' + id, image: abs + base + 'a0.jpg' } });
    res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Robots-Tag', 'noindex'); res.end(html);
  } catch (e) { fail(500, 'Something went wrong'); }
};
