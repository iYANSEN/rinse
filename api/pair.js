// POST /api/pair
//   { job, photos:[{id, thumb(dataURL), t?}] }  -> { roles:{id:'before'|'after'}, pairs:[[beforeId, afterId, caption]], message }
//   { task:'message', job, client?, pairs }     -> { message }
// Plain-JSON replies (no tool calls) so it works with any OpenAI-compatible vision model. The app falls back to
// on-device similarity pairing if this fails, so a bad key or no signal never blocks the crew.
// Config (env): LLM_API_KEY (required for AI), LLM_BASE_URL, LLM_MODEL, DAILY_CAP, HOURLY_CAP
const MAX_PHOTOS = 40;
const PAIR_PROMPT = `You help a pressure-washing and exterior-cleaning crew organise job photos. You get numbered photos of ONE job, each preceded by its id and roughly when it was taken.
1. Classify every photo: "before" = dirty (stains, moss, algae, mould, grime, oxidation, faded or cluttered), "after" = clean.
2. Pair each before with the after photo of the SAME spot and angle (same house, driveway, deck, fence...). A photo can be in at most one pair. Leave unmatched photos out of the pairs. If several photos show the same spot, pair the most similar framing.
3. Give each pair a short caption naming the surface (e.g. "Front driveway", "Back deck", "Roof, north side"), 2-4 words, no punctuation.
4. Write "message": two friendly sentences to the client about the finished job. Mention the job name, no prices, no emojis, no exclamation marks.
Reply with JSON only, no code fences: {"roles":{"<id>":"before|after"},"pairs":[["<beforeId>","<afterId>","<caption>"]],"message":"..."}`;
const MSG_PROMPT = `Write "message": two friendly, plain sentences from a pressure-washing crew to their client about a finished job. Mention the job name and the number of areas cleaned. No prices, no emojis, no exclamation marks. Reply with JSON only: {"message":"..."}`;

const hits = new Map(); let day = { d: '', n: 0 };
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (h.length >= (Number(process.env.HOURLY_CAP) || 20)) return true;
  const d = new Date().toISOString().slice(0, 10);
  if (day.d !== d) day = { d, n: 0 };
  if (day.n >= (Number(process.env.DAILY_CAP) || 300)) return true;
  h.push(now); hits.set(ip, h); day.n++; return false;
}
function parseJson(text) {
  const s = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim(), a = s.indexOf('{'), z = s.lastIndexOf('}');
  return JSON.parse(a >= 0 && z > a ? s.slice(a, z + 1) : s);
}
async function callModel(messages, ctl, maxTokens) {
  const url = (process.env.LLM_BASE_URL || 'https://api.freeaiapikey.com/v1').replace(/\/$/, '') + '/chat/completions';
  // max_tokens must cover hidden reasoning (some proxies think before answering) AND the JSON reply.
  const base = { model: process.env.LLM_MODEL || 'anthropic/claude-sonnet-5', temperature: 0, max_tokens: maxTokens || 4000, messages };
  const go = (extra) => fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.LLM_API_KEY }, body: JSON.stringify(Object.assign({}, base, extra)) });
  let r = await go({ response_format: { type: 'json_object' } });
  if (r.status === 400) r = await go({}); // some proxies reject response_format; the prompt already demands JSON
  return r;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const send = (c, o) => { res.statusCode = c; res.end(JSON.stringify(o)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  const b = req.body, isMsg = b && b.task === 'message';
  if (!b || typeof b !== 'object') return send(400, { error: 'bad_body' });
  if (!isMsg && (!Array.isArray(b.photos) || b.photos.length < 2 || b.photos.length > MAX_PHOTOS ||
      !b.photos.every((p) => p && typeof p.id === 'string' && p.id.length < 40 && typeof p.thumb === 'string' && /^data:image\/jpeg;base64,/.test(p.thumb) && p.thumb.length < 2.5e5)))
    return send(400, { error: 'Send 2-' + MAX_PHOTOS + ' photo thumbnails.' });
  if (!process.env.LLM_API_KEY) return send(503, { error: 'no_key' });
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x').split(',')[0].trim();
  if (limited(ip)) return send(429, { error: 'rate_limited' });
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 55000);
  try {
    const job = String(b.job || 'the job').slice(0, 80);
    let messages;
    if (isMsg) messages = [{ role: 'system', content: MSG_PROMPT }, { role: 'user', content: 'Job: ' + job + (b.client ? '\nClient: ' + String(b.client).slice(0, 60) : '') + '\nAreas cleaned: ' + (Number(b.pairs) || 1) }];
    else {
      const t0 = Math.min.apply(null, b.photos.map((p) => Number(p.t) || Date.now())), content = [{ type: 'text', text: 'Job: ' + job }];
      b.photos.forEach((p) => content.push({ type: 'text', text: 'id: ' + p.id + (p.t ? ' (taken +' + Math.round((Number(p.t) - t0) / 60000) + ' min)' : '') }, { type: 'image_url', image_url: { url: p.thumb } }));
      messages = [{ role: 'system', content: PAIR_PROMPT }, { role: 'user', content }];
    }
    const r = await callModel(messages, ctl, isMsg ? 1500 : Math.min(8000, 2500 + (b.photos ? b.photos.length : 12) * 75));
    if (r.status === 401 || r.status === 403) return send(502, { error: 'bad_key' });
    if (r.status === 429) return send(502, { error: 'provider_rate_limited' });
    if (!r.ok) return send(502, { error: 'model_error', status: r.status });
    const o = parseJson((await r.json()).choices[0].message.content);
    if (isMsg) return send(200, { message: String(o.message || '').slice(0, 400) });
    const ids = new Set(b.photos.map((p) => p.id)), roles = {}, pairs = [], used = new Set();
    for (const k in o.roles || {}) if (ids.has(k) && (o.roles[k] === 'before' || o.roles[k] === 'after')) roles[k] = o.roles[k];
    for (const p of o.pairs || []) if (Array.isArray(p) && roles[p[0]] === 'before' && roles[p[1]] === 'after' && !used.has(p[0]) && !used.has(p[1])) { used.add(p[0]); used.add(p[1]); pairs.push([p[0], p[1], String(p[2] || '').slice(0, 60)]); }
    send(200, { roles, pairs, message: String(o.message || '').slice(0, 400) });
  } catch (e) { send(504, { error: e && e.name === 'AbortError' ? 'timeout' : e instanceof TypeError ? 'unreachable' : 'bad_reply' }); } finally { clearTimeout(timer); }
};
