// Minimal Upstash Redis REST fake: POST / with ["SET",k,v,"EX",ttl] or ["GET",k]. Requires Bearer token.
const http = require('http'), db = new Map(); let sets = 0;
http.createServer((req, res) => { let raw = ''; req.on('data', (c) => raw += c); req.on('end', () => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/__stats') return res.end(JSON.stringify({ keys: db.size, sets }));
  if (req.headers.authorization !== 'Bearer up-token') { res.statusCode = 401; return res.end('{"error":"unauthorized"}'); }
  const [cmd, k, v] = JSON.parse(raw);
  if (cmd === 'SET') { db.set(k, v); sets++; return res.end('{"result":"OK"}'); }
  if (cmd === 'GET') return res.end(JSON.stringify({ result: db.has(k) ? db.get(k) : null }));
  res.statusCode = 400; res.end('{"error":"bad"}'); }); }).listen(4020, '127.0.0.1');
