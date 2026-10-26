// Fake OpenAI-compatible vision endpoint for tests. Replies with whatever the test posts to /__truth.
// /ok/v1 -> works | /bad/v1 -> 401 (rejected key) | /noformat/v1 -> 400 if response_format is sent (some proxies do this)
const http = require('http');
let truth = { roles: {}, pairs: [], message: 'Hi, your job is done.' }, last = null;
http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => raw += c); req.on('end', () => {
    const j = (c, o) => { res.statusCode = c; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    if (req.url === '/__truth') { truth = JSON.parse(raw); return j(200, { ok: true }); }
    if (req.url === '/__last') return j(200, last);
    const body = JSON.parse(raw || '{}'), mode = req.url.split('/')[1];
    const imgs = (body.messages || []).flatMap((m) => Array.isArray(m.content) ? m.content.filter((c) => c.type === 'image_url') : []);
    last = { mode, auth: req.headers.authorization, model: body.model, images: imgs.length, hasFormat: !!body.response_format, temp: body.temperature, imgIsJpeg: imgs.every((i) => /^data:image\/jpeg;base64,/.test(i.image_url.url)) };
    if (mode === 'bad') return j(401, { error: { message: 'invalid api key' } });
    if (mode === 'noformat' && body.response_format) return j(400, { error: { message: 'response_format unsupported' } });
    // real models often wrap JSON in prose/fences: do that in 'noformat' mode to exercise the parser
    const out = JSON.stringify(truth); j(200, { choices: [{ message: { content: mode === 'noformat' ? 'Sure! ```json\n' + out + '\n```' : out } }] });
  });
}).listen(4010, '127.0.0.1', () => console.log('mock llm on 4010'));
