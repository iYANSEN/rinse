const base = 'http://127.0.0.1:3000';
const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { st: r.status, t: await r.text() }; };
(async () => {
  let r = await post('/api/share', { op: 'create', meta: { title: 'x', pairs: [] } });
  console.log('no-pairs 400:', r.st === 400);
  r = await post('/api/share', { op: 'create', meta: { title: '<script>alert(1)</script>', color: 'red;}</style><script>alert(4)</script>', review: 'javascript:alert(5)', pairs: [{ cap: '"onmouseover="alert(6)' }] } });
  const c = JSON.parse(r.t);
  console.log('create 200+token:', r.st === 200 && !!c.token, 'id:', c.id);
  const tiny = 'data:image/jpeg;base64,' + Buffer.from('fakejpegdata1234567890'.repeat(50)).toString('base64');
  r = await post('/api/share', { op: 'img', id: c.id, token: 'nope', rev: c.rev, key: 'a0', data: tiny });
  console.log('bad-token 403:', r.st === 403);
  r = await post('/api/share', { op: 'create', id: c.id, token: 'nope', meta: { pairs: [{ cap: '' }] } });
  console.log('hijack 403:', r.st === 403);
  r = await post('/api/share', { op: 'img', id: c.id, token: c.token, rev: c.rev, key: '../../etc/passwd', data: tiny });
  console.log('traversal 400:', r.st === 400);
  r = await post('/api/share', { op: 'img', id: c.id, token: c.token, rev: c.rev, key: 'a0', data: 'data:text/html;base64,PHNjcmlwdD4=' });
  console.log('non-image 400:', r.st === 400);
  for (const k of ['a0', 'b0']) { r = await post('/api/share', { op: 'img', id: c.id, token: c.token, rev: c.rev, key: k, data: tiny }); console.log('img', k, r.st); }
  r = await post('/api/share', { op: 'done', id: c.id, token: c.token, rev: c.rev });
  console.log('done 200:', r.st === 200);
  const g = await fetch(base + '/g/' + c.id), html = await g.text();
  console.log('xss escaped:', !html.includes('<script>alert') && html.includes('&lt;script&gt;alert(1)'));
  console.log('color fallback:', html.includes('--brand:#0a7a79') && !html.includes('red;}'));
  console.log('no javascript: url:', !html.includes('javascript:'));
  console.log('bad-gallery 404:', (await fetch(base + '/g/doesnotexist1')).status === 404);
  console.log('GET share 405:', (await fetch(base + '/api/share')).status === 405);
  console.log('env blocked 404:', (await fetch(base + '/.env')).status === 404);
})();
