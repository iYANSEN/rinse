// Local dev server: node server.js -> http://localhost:3000
// On Vercel the files in api/ run as serverless functions and vercel.json provides the /g/:id rewrites.
const http = require('http'), fs = require('fs'), path = require('path');
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (e) { /* no .env */ }
const store = require('./lib/store');
const api = { '/api/pair': require('./api/pair.js'), '/api/share': require('./api/share.js'), '/api/health': require('./api/health.js'), '/api/g': require('./api/g.js') };
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2', webmanifest: 'application/manifest+json' };
const STATIC = /^\/(index\.html|app\.js|flair\.js|pairing\.js|gallery-template\.js|styles\.css|sw\.js|manifest\.webmanifest|icon\.svg|icon-[a-z0-9]+\.png|apple-touch-icon\.png|fonts\/[\w.-]+\.woff2|demo-seed\.json|import-demo\.js|demo-data\.js|paired-photos\/[\w.-]+)$/;

http.createServer((req, res) => {
  let url = req.url.split('?')[0], m;
  if ((m = /^\/g\/([\w-]+)(?:\/([\w.-]+))?$/.exec(url))) { req.url = '/api/g?id=' + m[1] + (m[2] ? '&f=' + m[2] : ''); url = '/api/g'; }
  if (api[url]) {
    let raw = ''; req.on('data', (c) => { raw += c; if (raw.length > 8e6) req.destroy(); });
    return req.on('end', () => { try { req.body = JSON.parse(raw || 'null'); } catch (e) { req.body = null; } Promise.resolve(api[url](req, res)).catch(() => { res.statusCode = 500; res.end('error'); }); });
  }
  const f = url === '/' ? 'index.html' : STATIC.test(url) ? url.slice(1) : null;
  if (!f) { res.statusCode = 404; return res.end('Not found'); }
  fs.readFile(path.join(__dirname, f), (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[f.split('.').pop()] + (/^(text|image\/svg)/.test(MIME[f.split('.').pop()]) || f.endsWith('js') ? '; charset=utf-8' : ''));
    res.setHeader('X-Content-Type-Options', 'nosniff'); if (f === 'sw.js') res.setHeader('Cache-Control', 'no-cache');
    res.end(buf);
  });
}).listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => {
  const s = store();
  console.log('Rinse on http://localhost:' + (Number(process.env.PORT) || 3000));
  console.log('  AI pairing : ' + (process.env.LLM_API_KEY ? 'ON  (' + (process.env.LLM_MODEL || 'anthropic/claude-sonnet-5') + ')' : 'OFF (no LLM_API_KEY in .env, using on-device pairing)'));
  console.log('  Share links: ' + s.kind + (s.persistent ? '' : '  (temporary, add Upstash env vars for permanent links)'));
});
