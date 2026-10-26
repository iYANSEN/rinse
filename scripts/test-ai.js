#!/usr/bin/env node
// Live check of your API key with real photos:   npm run test:ai
// Sends 14 sample photos (6 before/after pairs of REAL photographs with grime added + 2 unrelated ones) to /api/pair
// exactly as the app does, then scores the answer against the known truth. Reads LLM_API_KEY etc. from .env.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
try { for (const l of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (e) {}
if (!process.env.LLM_API_KEY) { console.log('\nNo LLM_API_KEY found.\n  1. Open .env\n  2. Paste your key after LLM_API_KEY=\n  3. Run:  npm run test:ai\n'); process.exit(2); }
const handler = require('../api/pair.js'), dir = path.join(root, 'test', 'live'), truth = JSON.parse(fs.readFileSync(path.join(dir, 'truth.json'), 'utf8'));
const names = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort(), t0 = Date.now() - 3600e3;
const photos = names.map((n, i) => ({ id: n.replace('.jpg', ''), thumb: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, n)).toString('base64'), t: t0 + i * 60e3 }));
const req = { method: 'POST', headers: {}, socket: { remoteAddress: 'test-ai' }, body: { job: 'Test driveway and patio', photos } };
const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
const HELP = { no_key: 'No key was read from .env.', bad_key: 'The endpoint rejected the key (401/403). Check the key, and LLM_BASE_URL / LLM_MODEL in .env.', provider_rate_limited: 'The provider says slow down (429). Wait a minute and retry.', unreachable: 'Could not connect to LLM_BASE_URL. Check the address in .env and your internet connection.', timeout: 'No answer within 55 s. The model may be slow or the endpoint down.', bad_reply: 'The model answered, but not with JSON Rinse could read.', model_error: 'The endpoint returned an error. Check LLM_MODEL is a vision-capable model name the endpoint knows.' };
console.log(`Endpoint: ${process.env.LLM_BASE_URL || 'https://api.freeaiapikey.com/v1'}\nModel   : ${process.env.LLM_MODEL || 'anthropic/claude-sonnet-5'}\nSending ${photos.length} photos...`);
const start = Date.now();
Promise.resolve(handler(req, res)).then(() => {
  const o = JSON.parse(res.body), secs = ((Date.now() - start) / 1000).toFixed(1);
  if (res.statusCode !== 200) { console.log(`\nFAILED (${res.statusCode}): ${o.error}${o.status ? ' / provider status ' + o.status : ''}\n  ${HELP[o.error] || ''}\n`); process.exit(1); }
  const want = new Set(truth.pairs.map((p) => p[0].replace('.jpg', '') + '>' + p[1].replace('.jpg', '')));
  const got = o.pairs.map((p) => p[0] + '>' + p[1]), right = got.filter((g) => want.has(g)).length, wrong = got.length - right;
  const loose = new Set(truth.loose.map((f) => f.replace('.jpg', ''))), forced = o.pairs.filter((p) => loose.has(p[0]) || loose.has(p[1])).length;
  console.log(`\nAnswered in ${secs}s\n  pairs correct : ${right}/${want.size}\n  pairs wrong   : ${wrong}\n  unrelated photos force-paired: ${forced}\n  captions      : ${o.pairs.map((p) => p[2]).filter(Boolean).join(', ') || '(none)'}\n  message       : ${o.message || '(none)'}`);
  const ok = right >= 5 && wrong === 0 && forced === 0; console.log(ok ? '\nAI pairing is working. Turn it on in the app: restart `node server.js`.\n' : '\nThe key works but accuracy is lower than expected. Try a stronger vision model in LLM_MODEL.\n'); process.exit(ok ? 0 : 1);
});
