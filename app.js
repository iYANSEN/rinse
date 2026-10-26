/* Rinse app. Vanilla JS, no build step. Photos live in IndexedDB so everything works offline;
   publishing a client link and the CRM webhook go through an outbox that syncs when the signal returns. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app'), esc = Gallery.esc;
  let db, cur = null, objUrls = [], publishing = null, busy = false, health = { ai: false, share: '', sharePersistent: true };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const COLORS = ['#0a7a79', '#1d4ed8', '#15803d', '#6d28d9', '#b91c1c', '#334155'];
  const settings = () => { try { return JSON.parse(localStorage.getItem('rinse.settings')) || {}; } catch (e) { return {}; } };
  const fmtDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : (d || ''); };
  const okHook = (u) => /^https:\/\/[^\s]+$/.test(u || '');
  const ICON = { cam: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>', pair: '<path d="M8 6h11M8 6l3-3M8 6l3 3M16 18H5M16 18l-3-3M16 18l-3 3"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>', share: '<path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>', dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', back: '<path d="M15 5l-7 7 7 7"/>', redo: '<path d="M4 12a8 8 0 108-8M4 4v5h5"/>', swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', unlink: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7M4 4l16 16"/>', save: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>' };
  const ico = (n) => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>';

  function toast(t, ms) { document.querySelectorAll('#toasts .toast:not(.progress)').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('#toasts').append(d); setTimeout(() => d.remove(), ms || 3400); }
  function progress(t) { let d = $('#toasts .progress'); if (!t) { if (d) d.remove(); return; } if (!d) { d = document.createElement('div'); d.className = 'toast progress'; $('#toasts').append(d); } d.textContent = t; }
  function sheet(title, items) {
    const el = $('#sheet-in'), dlg = $('#sheet'); el.innerHTML = '<h3>' + esc(title) + '</h3>';
    items.concat([['Cancel', null]]).forEach((it) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it[0]; if (it[2]) b.className = it[2]; b.onclick = () => { dlg.close(); if (it[1]) it[1](); }; el.append(b); });
    dlg.showModal();
  }
  function dropUrls() { objUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); objUrls = []; }
  const blobUrl = (b) => { const u = URL.createObjectURL(b); objUrls.push(u); return u; };

  // ---------- IndexedDB (a separate database per workspace: live vs demo) ----------
  const mode = () => (localStorage.getItem('rinse.mode') === 'demo' ? 'demo' : 'live');
  const dbNameFor = (m) => (m === 'demo' ? 'rinse-demo' : 'rinse');
  const setMode = (m) => localStorage.setItem('rinse.mode', m);
  const contactsKey = () => (mode() === 'demo' ? 'rinse.contacts.demo' : 'rinse.contacts');
  function deleteDb(name) { return new Promise((res) => { let q; try { q = indexedDB.deleteDatabase(name); } catch (e) { return res(); } q.onsuccess = q.onerror = q.onblocked = () => res(); }); }
  function open(name) { return new Promise((res, rej) => {
    if (db) { try { db.close(); } catch (e) {} db = null; }
    const r = indexedDB.open(name || dbNameFor(mode()), 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('jobs', { keyPath: 'id' }); d.createObjectStore('photos', { keyPath: 'id' }).createIndex('job', 'jobId'); d.createObjectStore('outbox', { keyPath: 'id' }); };
    r.onsuccess = () => { db = r.result; res(); }; r.onerror = () => rej(r.error); }); }
  const rq = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const st = (s, m) => db.transaction(s, m || 'readonly').objectStore(s);
  const put = (s, v) => rq(st(s, 'readwrite').put(v)), del = (s, k) => rq(st(s, 'readwrite').delete(k)), all = (s) => rq(st(s).getAll());
  const photosOf = (id) => rq(st('photos').index('job').getAll(id));
  const getJob = async (id) => (await all('jobs')).find((j) => j.id === id);

  // ---------- images ----------
  function scale(src, w, h, max, q) { const s = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return { canvas: c, url: (t) => c.toDataURL(t || 'image/jpeg', q), blob: () => new Promise((r) => c.toBlob(r, 'image/jpeg', q)) }; }
  async function decode(blob) { try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch (e) { return await createImageBitmap(blob); } }
  function signatureOf(src) { const c = document.createElement('canvas'); c.width = Pairing.W; c.height = Pairing.H; const x = c.getContext('2d'); x.drawImage(src, 0, 0, c.width, c.height); return Pairing.signature(x.getImageData(0, 0, c.width, c.height).data); }
  async function makePhoto(src, w, h, meta) { const big = scale(src, w, h, 1600, .85), small = scale(src, w, h, 384, .7);
    return Object.assign({ id: uid(), blob: await big.blob(), thumb: small.url(), sig: signatureOf(src), role: null, pairId: null, t: Date.now() }, meta); }
  async function importFile(file, jobId) { if (file && file.size > 40e6) throw new Error('too big'); const bmp = await decode(file);
    const p = await makePhoto(bmp, bmp.width, bmp.height, { jobId, name: file.name, t: file.lastModified || Date.now() }); if (bmp.close) bmp.close(); return p; }
  async function jpeg(blob, max, q) { const bmp = await decode(blob), u = scale(bmp, bmp.width, bmp.height, max, q).url(); if (bmp.close) bmp.close(); return u; }
  const loadImg = async (url) => { const i = new Image(); i.src = url; await i.decode(); return i; };
  async function ensureSigs(ps) { for (const p of ps) if (!p.sig) { p.sig = signatureOf(await loadImg(p.thumb)); await put('photos', p); } }

  // ---------- demo job (real paired photos from /paired-photos/) ----------
  async function makeDemo() {

    const PAIRS = [
      { num: 1, name: 'Concrete Driveway', client: 'Miller Residence', address: '124 Oak Street', cap: 'Front driveway', ext: '.jpg' },
      { num: 2, name: 'Paved Driveway', client: 'Chen Family', address: '88 Maple Lane', cap: 'Paved driveway', ext: '.jpg' },
      { num: 3, name: 'Brick Paver Driveway', client: 'Rodriguez Home', address: '210 Pine Avenue', cap: 'Brick driveway and path', ext: '.jpg' },
      { num: 4, name: 'House Exterior Wash', client: 'Thompson Property', address: '45 Elm Court', cap: 'Front entry and walls', ext: '.jpg' },
      { num: 5, name: 'Brick Wall and Side Path', client: 'Williams Home', address: '33 Cedar Drive', cap: 'Side brick wall', ext: '.jpg' },
      { num: 6, name: 'Patio Cleaning', client: 'Davis Garden', address: '77 Birch Road', cap: 'Backyard patio', ext: '.jpg' },
      { num: 7, name: 'Side Pathway', client: 'Anderson Entry', address: '12 Summit Lane', cap: 'Side pathway', ext: '.jpg' },
      { num: 8, name: 'Stairway Cleaning', client: 'Garcia Home', address: '560 Lake View', cap: 'Front staircase', ext: '.jpg' },
      { num: 9, name: 'Garden Furniture', client: 'Martinez Garden', address: '99 Ridge Road', cap: 'Garden bench and table', ext: '.jpg' },
      { num: 10, name: 'Cladding Cleaning', client: 'Taylor House', address: '14 Harbor Point', cap: 'Side cladding', ext: '.jpg' },
      { num: 11, name: 'Balcony Cleaning', client: 'Harbor Point, Unit 4B', address: '4B Harbor Point', cap: 'Balcony floor', ext: '.jpg' },
    ];

    const now = Date.now();

    async function loadPhotoAsBlob(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load ' + url);
      return await res.blob();
    }

    async function makePhotoFromUrl(url, meta) {
      const blob = await loadPhotoAsBlob(url);
      const bmp = await decode(blob);
      return makePhoto(bmp, bmp.width, bmp.height, meta);
    }

    // Believable schedule: jobs 1-9 finished over the last nine days, 10-11 are upcoming.
    const offsets = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 2, 5];
    let failed = 0;

    for (let i = 0; i < PAIRS.length; i++) {
      const p = PAIRS[i], num = String(p.num).padStart(2, '0');
      const jobId = 'demo-' + num;
      const offset = offsets[i];
      const date = new Date(now + offset * 86400000).toISOString().slice(0, 10);
      const dueDate = offset > 0 ? new Date(now + (offset + 2) * 86400000).toISOString().slice(0, 10) : '';
      // Job 9 is seeded unpaired so the demo can show Pair; job 8 has only a before photo.
      const pairId = p.num === 9 ? null : 'p-demo-' + num;

      await put('jobs', {
        id: jobId,
        name: p.name,
        client: p.client,
        address: p.address,
        date,
        dueDate,
        demo: true,
        created: now + offset * 86400000 - 20 * 3600000,
        message: `Hi ${p.client}, your ${p.name.toLowerCase()} looks brand new after today's wash. Slide the photo below to see the difference!`,
      });

      const beforeFile = p.num + '-1' + p.ext, afterFile = p.num + '-2' + p.ext;
      const t0 = now + offset * 86400000 - 20 * 3600000 + 2 * 3600000;

      try {
        await put('photos', await makePhotoFromUrl('/paired-photos/' + beforeFile, { id: jobId + '-b', jobId, name: beforeFile, role: 'before', pairId, t: t0 }));
      } catch (e) { failed++; }

      if (p.num !== 8) {
        try {
          await put('photos', await makePhotoFromUrl('/paired-photos/' + afterFile, { id: jobId + '-a', jobId, name: afterFile, role: 'after', pairId, cap: p.cap, t: t0 + 3 * 3600000 }));
        } catch (e) { failed++; }
      }
    }

    if (failed) toast('Some sample photos could not load. Open the demo again to retry.', 5000);
    return 'demo-01';
  }
  // The demo workspace is seeded once, with fixed ids, so boot is idempotent and never
  // stacks duplicate jobs. A job kept from an earlier broken build is dropped and reseeded.
  async function demoReady() {
    const j = await getJob('demo-01');
    if (!j) return false;
    const ps = await photosOf('demo-01');
    return ps.length >= 1 && ps.every((p) => p.thumb && p.blob);
  }
  async function clearDemo() {
    for (const j of (await all('jobs')).filter((x) => x.demo)) {
      for (const p of await photosOf(j.id)) await del('photos', p.id);
      await del('jobs', j.id);
    }
  }
  async function ensureDemoWorkspace(force) {
    if (!force && await demoReady()) return 'demo-01';
    await clearDemo();
    return makeDemo();
  }
  // Demo jobs belong to the demo database only. Older builds wrote them into the live one,
  // so remove any leftovers the first time a live workspace boots.
  async function purgeDemoFromLive() {
    if (mode() !== 'live') return;
    await clearDemo();
  }

  // ---------- pairs ----------
  function groupPairs(ps) {
    const m = {}, pairs = [], loose = [];
    ps.forEach((p) => { if (p.pairId && p.role) (m[p.pairId] = m[p.pairId] || {})[p.role] = p; else loose.push(p); });
    Object.keys(m).forEach((k) => { const g = m[k]; if (g.before && g.after) pairs.push({ id: k, before: g.before, after: g.after }); else { if (g.before) loose.push(g.before); if (g.after) loose.push(g.after); } });
    pairs.sort((a, b) => a.before.t - b.before.t); loose.sort((a, b) => a.t - b.t); return { pairs, loose };
  }
  function applyPairs(ps, list, roles) {
    const by = {}; ps.forEach((p) => { by[p.id] = p; if (roles && roles[p.id]) p.role = roles[p.id]; });
    list.forEach((pr) => { const b = by[pr[0]], a = by[pr[1]]; if (!b || !a) return; const pid = 'p' + uid(); b.role = 'before'; a.role = 'after'; b.pairId = a.pairId = pid; if (pr[2] && !a.cap) a.cap = pr[2]; });
  }
  const AI_ERR = { bad_key: 'The AI key was rejected', rate_limited: 'The AI limit was reached for now', provider_rate_limited: 'The AI service is busy', timeout: 'The AI took too long', unreachable: 'The AI service could not be reached', bad_reply: 'The AI sent a reply Rinse could not read', model_error: 'The AI service had an error', no_key: '' };
  async function aiPair(pool) {
    try {
      const r = await fetch('api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: cur.name, photos: pool.map((p) => ({ id: p.id, thumb: p.thumb, t: p.t })) }) });
      const o = await r.json().catch(() => ({})); if (!r.ok) return { err: AI_ERR[o.error] != null ? AI_ERR[o.error] : 'The AI is unavailable' }; return o;
    } catch (e) { return { err: 'The AI could not be reached' }; }
  }
  async function smartPair(all_) {
    if (busy) return; busy = true;
    try {
      const ps = await photosOf(cur.id); await ensureSigs(ps);
      if (all_) ps.forEach((p) => { p.pairId = null; });
      let pool = ps.filter((p) => !(p.pairId && p.role));
      if (pool.length < 2) { toast('Add at least 2 unpaired photos first.'); return; }
      const how = []; let note = '';
      if (navigator.onLine && health.ai && pool.length <= 40) {
        progress('Asking AI to match your photos…'); const o = await aiPair(pool); progress();
        if (o.pairs && o.pairs.length) { applyPairs(ps, o.pairs, o.roles); how.push('AI'); if (o.message && (!cur.message || cur.autoMsg)) { cur.message = o.message; cur.autoMsg = true; await put('jobs', cur); } }
        else if (o.err) note = o.err + '. Matched on this phone instead.';
        pool = ps.filter((p) => !(p.pairId && p.role));
      }
      if (pool.length >= 2) {
        const r = Pairing.pairUp(pool.map((p) => ({ id: p.id, t: p.t, role: p.role, sig: p.sig })));
        if (r.pairs.length) { applyPairs(ps, r.pairs, r.roles); how.push('visual match'); }
        else if (!how.length) { const tr = Pairing.timeOrder(pool.map((p) => ({ id: p.id, t: p.t, role: p.role }))); applyPairs(ps, tr.pairs, tr.roles); how.push('time order'); note = 'Nothing looked alike, so Rinse paired by time. Check each pair.'; }
      }
      for (const p of ps) await put('photos', p);
      const n = groupPairs(ps).pairs.length, left = groupPairs(ps).loose.length;
      toast(note || ('Paired by ' + how.join(' + ') + '. ' + n + (n === 1 ? ' area' : ' areas') + (left ? ', ' + left + ' left to sort.' : ' ready.')), 4200);
    } finally { busy = false; progress(); renderJob(); }
  }

  // ---------- camera with ghost overlay (the "after" shot lines up with the "before") ----------
  async function openCamera(mode, targets) {
    targets = targets || [];
    if (mode === 'after' && !targets.length) { toast('Every before photo already has an after.'); return; }
    const cam = $('#cam'), hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); let stream = null, idx = 0, shots = 0;
    cam.hidden = false; document.body.style.overflow = 'hidden';
    cam.innerHTML = '<video playsinline muted autoplay></video><img class="ghost" alt="" hidden><div class="flash"></div>' +
      '<div class="top"><button type="button" class="c" id="c-x" aria-label="Close camera">Done</button><div class="t" id="c-t"></div><button type="button" class="c" id="c-skip" ' + (mode === 'after' ? '' : 'hidden') + '>Skip</button></div>' +
      '<div class="msg" id="c-msg" hidden></div>' +
      '<div class="bottom">' + (mode === 'after' ? '<label class="ghost-ctl">Overlay<input id="c-op" type="range" min="0" max="100" value="45" aria-label="Overlay strength"></label>' : '') +
      '<div class="shutter-row"><div class="last" id="c-last"></div><button type="button" class="shutter" id="c-shot" aria-label="Take photo"></button><span></span></div></div>';
    const video = $('video', cam), ghost = $('.ghost', cam), title = $('#c-t', cam), flash = $('.flash', cam);
    const label = () => { if (mode === 'before') { title.innerHTML = 'Before photos<small>' + shots + ' taken</small>'; return; } const t = targets[idx]; title.innerHTML = 'After' + (t.cap ? ': ' + esc(t.cap) : '') + '<small>' + (idx + 1) + ' of ' + targets.length + '. Line up with the faded photo</small>'; ghost.src = t.thumb; ghost.hidden = false; };
    label();
    const close = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); cam.hidden = true; cam.innerHTML = ''; document.body.style.overflow = ''; if (cur) renderJob(); };
    async function commit(photo) {
      photo.jobId = cur.id; photo.role = mode;
      if (mode === 'after') { const tg = targets[idx], pid = tg.pairId || 'p' + uid();
        if (tg.pairId) { const old = (await photosOf(cur.id)).find((p) => p.pairId === tg.pairId && p.role === 'after'); if (old) { photo.cap = old.cap; await del('photos', old.id); } }
        photo.pairId = pid; tg.pairId = pid; await put('photos', tg); }
      await put('photos', photo); shots++; $('#c-last', cam).innerHTML = '<img alt="" src="' + photo.thumb + '">';
      if (navigator.vibrate) navigator.vibrate(18);
      if (mode === 'after') { idx++; if (idx >= targets.length) { close(); toast('Done: every before has an after.'); return; } }
      label();
    }
    async function shoot() { if (!video.videoWidth) return; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); await commit(await makePhoto(video, video.videoWidth, video.videoHeight, { t: Date.now() })); }
    function fallback(why) {
      $('#c-msg', cam).hidden = false; $('#c-msg', cam).innerHTML = '<b>' + esc(why) + '</b><p>Use your phone camera instead. The faded overlay needs camera access.</p>';
      $('#c-shot', cam).onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment'); i.onchange = async () => { if (i.files[0]) await commit(await importFile(i.files[0], cur.id)); }; i.click(); };
    }
    $('#c-x', cam).onclick = close; $('#c-skip', cam).onclick = () => { idx++; if (idx >= targets.length) close(); else label(); };
    const op = $('#c-op', cam); if (op) op.oninput = () => { ghost.style.opacity = op.value / 100; };
    if (!hasCam) return fallback('This browser has no camera access.');
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false }); video.srcObject = stream; await video.play().catch(() => {}); $('#c-shot', cam).onclick = shoot; }
    catch (e) { fallback('Camera permission was blocked.'); }
  }

  // ---------- client link: publish through an outbox so it works with bad signal ----------
  const defaultMessage = (job, n) => 'Hi ' + (job.client || 'there') + ', your ' + job.name + ' is finished. ' + (n > 1 ? 'Slide each photo below to see the difference in all ' + n + ' areas.' : 'Slide the photo below to see the difference.');
  const pairSig = (job, pairs, S) => hash([job.name, job.client, job.address, job.date, job.message || '', S.business, S.phone, S.contact, S.review, S.color, S.logo ? S.logo.length : 0].concat(pairs.map((p) => p.before.id + p.after.id + (p.after.cap || ''))).join('|'));
  async function api(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const o = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(o.error || 'http ' + r.status); e.code = o.error || (r.status === 404 ? 'no_server' : 'http'); e.status = r.status; throw e; } return o;
  }
  async function doPublish(jobId) {
    const job = await getJob(jobId); if (!job) return; const ps = await photosOf(jobId), pairs = groupPairs(ps).pairs, S = settings(); if (!pairs.length) return;
    if (!job.message) { job.message = defaultMessage(job, pairs.length); await put('jobs', job); }
    const meta = { title: job.name, address: job.address, date: fmtDate(job.date), message: job.message, business: S.business, phone: S.phone, contact: S.contact, color: S.color, review: S.review, hasLogo: !!S.logo, pairs: pairs.map((p) => ({ cap: p.after.cap || '' })) };
    publishing = { jobId, done: 0, total: pairs.length * 2 + (S.logo ? 1 : 0) }; renderShare();
    let c; try { c = await api('api/share', { op: 'create', id: job.share && job.share.id, token: job.share && job.share.token, meta }); }
    catch (e) { if (e.code === 'bad_token') { job.share = null; c = await api('api/share', { op: 'create', meta }); } else throw e; }
    const token = c.token || job.share.token, tasks = [];
    pairs.forEach((p, i) => { tasks.push(['b' + i, p.before.blob]); tasks.push(['a' + i, p.after.blob]); }); if (S.logo) tasks.push(['logo', S.logo]);
    let next = 0; const worker = async () => { while (next < tasks.length) { const t = tasks[next++], data = t[0] === 'logo' ? t[1] : await jpeg(t[1], 1200, .78);
      for (let tries = 0; ; tries++) { try { await api('api/share', { op: 'img', id: c.id, token, rev: c.rev, key: t[0], data }); break; } catch (e) { if (tries >= 2 || e.code) throw e; await new Promise((r) => setTimeout(r, 600 * (tries + 1))); } }
      publishing.done++; renderShare(); } };
    await Promise.all([worker(), worker(), worker()]);
    const d = await api('api/share', { op: 'done', id: c.id, token, rev: c.rev });
    job.share = { id: c.id, token, url: d.url, rev: c.rev, at: Date.now(), sig: pairSig(job, pairs, S) }; await put('jobs', job); publishing = null;
    if (cur && cur.id === jobId) cur = job; toast('Client link is ready.'); renderShare();
    if (okHook(S.hook) && S.autoCrm) { await enqueueCRM(jobId); setTimeout(flush, 400); }
  }
  async function queuePublish() {
    const items = await all('outbox'); if (!items.some((o) => o.type === 'publish' && o.jobId === cur.id)) await put('outbox', { id: uid(), type: 'publish', jobId: cur.id, created: Date.now() });
    if (!navigator.onLine) toast('You are offline. The link will be made when you reconnect.', 4200);
    renderShare(); updateNet(); flush();
  }

  // ---------- CRM webhook (Zapier / Make). Sent as a simple form post so it needs no CORS preflight. ----------
  async function enqueueCRM(jobId) {
    const job = await getJob(jobId), ps = await photosOf(jobId), pairs = groupPairs(ps).pairs, S = settings();
    const payload = { event: 'job_gallery_ready', business: S.business || '', job: { id: job.id, name: job.name, client: job.client || '', address: job.address || '', date: job.date || '' }, photos: ps.length, pairs: pairs.length,
      areas: pairs.map((p) => p.after.cap || '').filter(Boolean).join(', '), message: job.message || '', gallery_url: job.share ? job.share.url : '', sent_at: new Date().toISOString() };
    await put('outbox', { id: uid(), type: 'crm', created: Date.now(), payload });
  }
  function postHook(url, p) {
    const f = new URLSearchParams(), flat = { event: p.event, business: p.business, job_id: p.job && p.job.id, job_name: p.job && p.job.name, client: p.job && p.job.client, address: p.job && p.job.address, date: p.job && p.job.date, photos: p.photos, pairs: p.pairs, areas: p.areas, message: p.message, gallery_url: p.gallery_url, sent_at: p.sent_at };
    Object.keys(flat).forEach((k) => f.append(k, flat[k] == null ? '' : flat[k])); f.append('json', JSON.stringify(p));
    return fetch(url, { method: 'POST', mode: 'no-cors', body: f });
  }
  async function sendCRM() {
    const S = settings(); if (!okHook(S.hook)) { toast(S.hook ? 'The webhook address must start with https://' : 'Add your Zapier or Make webhook in Settings first.'); openSettings(); return; }
    await enqueueCRM(cur.id); if (!navigator.onLine) toast('You are offline. It will send when you reconnect.'); updateNet(); flush();
  }
  const errText = (e) => ({ no_server: 'Client links need the Rinse server (this copy is static).', rate_limited: 'Too many uploads for now. Try again in a few minutes.', bad_image: 'One photo could not be uploaded.', store_error: 'The server could not save the link.' }[e.code] || 'Could not create the link. Try again.');
  let flushing = false;
  async function flush() { if (flushing) return; flushing = true; try { await flushOnce(); } finally { flushing = false; updateNet(); } }
  async function flushOnce() {
    if (!navigator.onLine) return;
    const items = (await all('outbox')).sort((a, b) => (a.created || 0) - (b.created || 0));
    for (const it of items) {
      try {
        if (it.type === 'publish') { await doPublish(it.jobId); await del('outbox', it.id); renderShare(); }
        else { const S = settings(); if (!okHook(S.hook)) continue; await postHook(S.hook, it.payload); await del('outbox', it.id); toast('Sent to your CRM: ' + it.payload.job.name); }
      } catch (e) {
        publishing = null; renderShare(); it.tries = (it.tries || 0) + 1;
        const transient = e instanceof TypeError || e.code === 'rate_limited' || e.status >= 500;
        if (!transient || it.tries >= 5) { await del('outbox', it.id); toast(errText(e), 5000); } else { await put('outbox', it); break; }
      }
    }
  }
  async function updateNet() {
    const n = (await all('outbox')).length, e = $('#net'); e.textContent = (navigator.onLine ? 'Online' : 'Offline') + (n ? ' \u00b7 ' + n + ' waiting' : '');
    e.className = 'chip' + (navigator.onLine ? '' : ' off') + (n ? ' wait' : '');
  }

  // ---------- local gallery (preview / download when you want a file) and share image ----------
  async function localHtml() {
    const ps = await photosOf(cur.id), pairs = groupPairs(ps).pairs, S = settings(), out = [];
    for (let i = 0; i < pairs.length; i++) { progress('Building gallery ' + (i + 1) + ' of ' + pairs.length + '…'); out.push({ b: await jpeg(pairs[i].before.blob, 1200, .78), a: await jpeg(pairs[i].after.blob, 1200, .78), cap: pairs[i].after.cap }); }
    progress(); return { count: pairs.length, html: Gallery.render({ title: cur.name, address: cur.address, date: fmtDate(cur.date), message: cur.message || defaultMessage(cur, pairs.length), business: S.business, phone: S.phone, contact: S.contact, color: S.color, logo: S.logo, review: S.review, pairs: out }, {}) };
  }
  async function preview() {
    if (cur.share && cur.share.sig === view.sigNow) { window.open(cur.share.url, '_blank', 'noopener'); return; }
    const w = window.open('', '_blank'); const g = await localHtml(); if (!g.count) { if (w) w.close(); toast('Pair some photos first.'); return; }
    const u = URL.createObjectURL(new Blob([g.html], { type: 'text/html' })); if (w) w.location = u; else toast('Allow pop-ups to preview.');
  }
  async function downloadFile() {
    const g = await localHtml(); if (!g.count) { toast('Pair some photos first.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([g.html], { type: 'text/html' })); a.download = (cur.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'job') + '-gallery.html'; a.click(); toast('Saved. Email or text the file.');
  }
  function drawCover(x, img, dx, dy, dw, dh) { const s = Math.max(dw / img.width, dh / img.height), w = img.width * s, h = img.height * s; x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); x.restore(); }
  async function shareImage(pid) {
    const pr = groupPairs(await photosOf(cur.id)).pairs.find((p) => p.id === pid); if (!pr) return; const S = settings(), b = await decode(pr.before.blob), a = await decode(pr.after.blob);
    const c = document.createElement('canvas'); c.width = 1600; c.height = 900; const x = c.getContext('2d'); drawCover(x, b, 0, 0, 800, 900); drawCover(x, a, 800, 0, 800, 900); x.fillStyle = '#fff'; x.fillRect(798, 0, 4, 900);
    const pill = (t, px, col) => { x.font = '700 28px Figtree, system-ui, sans-serif'; const w = x.measureText(t).width + 32; x.fillStyle = col; x.beginPath(); x.roundRect(px, 28, w, 48, 24); x.fill(); x.fillStyle = '#fff'; x.fillText(t, px + 16, 62); };
    pill('BEFORE', 28, '#c2410c'); pill('AFTER', 828, '#0a7d46');
    if (S.business || pr.after.cap) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 820, 1600, 80); x.fillStyle = '#fff'; x.font = '600 30px Figtree, system-ui, sans-serif'; x.fillText([pr.after.cap, S.business].filter(Boolean).join('  \u00b7  '), 28, 872); }
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .9)), file = new File([blob], 'before-after.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: cur.name }).catch(() => {}); else { const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'before-after.jpg'; l.click(); toast('Image saved.'); }
  }

  // ---------- views ----------
  let view = { sigNow: '' };
  let homeFilter = 'all';
  async function renderHome(filter) {
    if (filter) homeFilter = filter;
    dropUrls(); cur = null;
    const allJobs = await all('jobs'), outbox = await all('outbox');
    const rows = [];
    for (const j of allJobs) {
      const ps = await photosOf(j.id), g = groupPairs(ps);
      const waiting = outbox.some((o) => o.type === 'publish' && o.jobId === j.id);
      const pendingCRM = outbox.some((o) => o.type === 'crm' && o.jobId === j.id);
      const cover = (g.pairs[0] && g.pairs[0].after.thumb) || (ps[0] && ps[0].thumb) || '';
      let status, statusClass, rank;
      if (waiting) { status = 'Waiting to sync'; statusClass = 'wait'; rank = 0; }
      else if (!ps.length) { status = j.stage === 'scheduled' ? 'Scheduled' : 'Needs photos'; statusClass = 'todo'; rank = j.stage === 'scheduled' ? 2 : 1; }
      else if (g.loose.length) { status = g.loose.length + ' photo' + (g.loose.length === 1 ? '' : 's') + ' to review'; statusClass = 'todo'; rank = 2; }
      else if (g.pairs.length && !j.share) { status = 'Ready to send'; statusClass = 'ready'; rank = 3; }
      else if (j.share) { status = 'Gallery shared'; statusClass = 'shared'; rank = 5; }
      else { status = 'Ready to send'; statusClass = 'ready'; rank = 3; }
      rows.push({ j, ps, g, cover, waiting, pendingCRM, status, statusClass, rank });
    }
    const readyCount = rows.filter((r) => r.g.pairs.length > 0 && r.g.loose.length === 0 && !r.j.share && !r.waiting).length;
    const totalPairs = rows.reduce((n, r) => n + r.g.pairs.length, 0);
    const pendingOps = outbox.length;
    rows.sort((a, b) => a.rank - b.rank || (b.j.created || 0) - (a.j.created || 0));
    const visible = homeFilter === 'ready' ? rows.filter((r) => r.g.pairs.length > 0 && r.g.loose.length === 0 && !r.j.share && !r.waiting) : homeFilter === 'all' ? rows : rows.filter(r => r.statusClass === homeFilter || (homeFilter==='sync' && (r.waiting || r.pendingCRM))); 
    const cards = visible.map(({ j, g, cover, waiting, status, statusClass, pendingCRM }) =>
      '<button class="job" data-act="open" data-id="' + esc(j.id) + '"><div class="cover">' + (cover ? '<img alt="" src="' + cover + '" loading="lazy">' : '<span class="cover-empty">' + ico('cam') + ' Photos will appear here</span>') +
      (waiting ? '<span class="badge wait">Waiting to sync</span>' : j.share ? '<span class="badge">Shared</span>' : '') + '</div><div class="job-title-row"><h3>' + esc(j.name) + '</h3><span class="job-state ' + statusClass + '">' + esc(status) + '</span></div><small>' + esc([j.client, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</small><small>' + g.pairs.length + ' pair' + (g.pairs.length === 1 ? '' : 's') + (g.loose.length ? ' · ' + g.loose.length + ' to sort' : '') + (pendingCRM ? ' · CRM pending' : '') + '</small></button>'
    ).join('');
    const syncLabel = !navigator.onLine ? 'OFFLINE' : pendingOps ? pendingOps + ' PENDING' : 'ALL SAFE';
    app.innerHTML = '<section class="hero"><h1>Before and after photos, ready to send</h1><p>Capture the work, review the pairs, and send your client one beautiful link. Keep shooting without a signal.</p>' +
      '<div class="row"><button class="btn primary" data-act="new">New job</button>' + (mode() === 'demo' ? '<button class="btn" data-act="mode-live">Exit demo</button>' : '<button class="btn" data-act="demo">Explore the demo · 11 jobs</button>') + '</div>' +
      '<div class="status-win"><div class="ttl">[ SYSTEM ] &nbsp; CREW STATUS</div>' +
      '<button class="status-cell" type="button" data-act="filter-all" aria-label="Show all jobs"><small>JOBS</small><strong>' + rows.length + '</strong><span class="status-note">Tap to view all</span></button>' +
      '<button class="status-cell" type="button" data-act="filter-ready" aria-label="Show jobs ready to send"><small>READY TO SEND</small><strong class="rank">' + readyCount + '</strong><span class="status-note">Tap to review</span></button>' +
      '<button class="status-cell" type="button" data-act="sync-details" aria-label="Open sync details"><small>SYNC</small><strong class="sync-value">' + syncLabel + '</strong><span class="status-note">' + (pendingOps ? 'Tap to inspect queue' : navigator.onLine ? 'Tap for sync details' : 'Saved on this device') + '</span></button>' +
      '<div class="status-foot">' + totalPairs + ' BEFORE / AFTER PAIRS CREATED</div></div></section>' +
      '<section class="sec"><div class="jobs-heading"><h2>' + (homeFilter === 'ready' ? 'Ready to send' : mode() === 'demo' ? 'Demo jobs' : 'Your jobs') + '</h2>' + (homeFilter === 'ready' ? '<button class="btn quiet sm" data-act="filter-all">Show all jobs</button>' : '') + '</div>' +
      (cards ? '<div class="jobs">' + cards + '</div>' : '<div class="empty"><b>' + (homeFilter === 'ready' ? 'Nothing ready to send yet' : mode() === 'demo' ? 'Loading sample jobs…' : 'No jobs yet') + '</b>' + (homeFilter === 'ready' ? 'Jobs with complete before/after pairs will appear here.' : mode() === 'demo' ? 'The demo is loading. If this stays empty, tap Reset in the banner above.' : 'Create your first job, or open the demo to see a finished gallery.') + '</div>') + '</section>';
    updateNet(); updateBanner();
  }
  async function renderJob() {
    const y = window.scrollY; dropUrls(); const ps = await photosOf(cur.id), g = groupPairs(ps), S = settings(), urls = {};
    g.pairs.forEach((p) => { urls[p.before.id] = blobUrl(p.before.blob); urls[p.after.id] = blobUrl(p.after.blob); }); view.sigNow = pairSig(cur, g.pairs, S);
    const cmp = (p, i) => '<div class="cmp" role="group" aria-label="Pair ' + (i + 1) + ': compare before and after"><img src="' + urls[p.after.id] + '" alt="After" decoding="async" loading="lazy"><img class="b" src="' + urls[p.before.id] + '" alt="Before" decoding="async" loading="lazy"><span class="tag l">Before</span><span class="tag r">After</span><div class="line"></div><div class="knob" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></div><input type="range" min="0" max="100" value="50" aria-label="Compare pair ' + (i + 1) + '"></div>';
    let h = '<div class="crumb"><button class="btn quiet" data-act="home">' + ico('back') + ' Jobs</button></div><div class="jhead"><div><h1>' + esc(cur.name) + '</h1><p class="jmeta">' + esc([cur.client, cur.address, fmtDate(cur.date)].filter(Boolean).join(' \u00b7 ')) + '</p></div><button class="btn quiet" data-act="more" aria-label="More options">' + ico('dots') + '</button></div>' +
      '<div class="stats"><span class="stat">' + g.pairs.length + (g.pairs.length === 1 ? ' pair' : ' pairs') + '</span>' + (cur.dueDate ? '<span class="stat">Due '+esc(fmtDate(cur.dueDate))+'</span>' : '') + (g.loose.length ? '<span class="stat todo">' + g.loose.length + ' to sort</span>' : '') + '<span class="stat">' + ps.length + ' photos</span></div>';
    const timeline=[]; if(cur.created) timeline.push({t:cur.created,title:'Job created',detail:'Job added to Rinse'}); if(ps.length){const times=ps.map(p=>p.t).filter(Boolean).sort((a,b)=>a-b);if(times.length)timeline.push({t:times[0],title:'First photos captured',detail:ps.length+' photo'+(ps.length===1?'':'s')+' currently saved'});if(times.length>1&&times[times.length-1]-times[0]>60000)timeline.push({t:times[times.length-1],title:'Latest photo captured',detail:g.pairs.length+' pair'+(g.pairs.length===1?'':'s')+' organized'});} if(cur.completedAt)timeline.push({t:new Date(cur.completedAt).getTime(),title:'Cleaning marked complete',detail:'Demo job completion milestone'}); if(cur.share&&cur.share.at)timeline.push({t:cur.share.at,title:'Gallery shared',detail:'Client link published'}); timeline.sort((a,b)=>a.t-b.t);
    const timelineHtml = '<details class="sec card timeline-card"><summary>Job timeline</summary><div class="timeline">'+timeline.map(ev=>'<div class="timeline-item"><span class="timeline-dot"></span><div><strong>'+esc(ev.title)+'</strong><p>'+esc(ev.detail)+'</p><small>'+esc(new Date(ev.t).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))+'</small></div></div>').join('')+(cur.share?'':'<div class="timeline-item upcoming"><span class="timeline-dot"></span><div><strong>Send gallery to client</strong><p>Next step when your pairs are ready.</p></div></div>')+'</div></details>';
    if (!ps.length) h += '<section class="sec card"><h2>Start with the before shots</h2><p class="hint">Photograph the dirty areas first. After the wash, tap After: a faded copy of each before helps you stand in the same spot. Or import photos you already took.</p><div class="row"><button class="btn primary" data-act="cam-before">' + ico('cam') + ' Before camera</button><label class="btn">' + ico('img') + ' Import photos<input class="files" type="file" accept="image/*" multiple hidden></label></div></section>';
    if (g.pairs.length) h += '<section class="sec card share" id="share"></section><section class="sec"><h2>Before and after</h2><div class="pairs">' + g.pairs.map((p, i) => '<article class="pair" data-pid="' + p.id + '">' + cmp(p, i) +
      '<input class="cap" value="' + esc(p.after.cap || '') + '" maxlength="60" placeholder="Name this area" aria-label="Area name for pair ' + (i + 1) + '"><div class="pactions"><button class="btn quiet sm" data-act="retake" data-pid="' + p.id + '">' + ico('redo') + ' Retake</button><button class="btn quiet sm" data-act="swap" data-pid="' + p.id + '">' + ico('swap') + ' Swap</button><button class="btn quiet sm" data-act="unpair" data-pid="' + p.id + '">' + ico('unlink') + ' Unpair</button><button class="btn quiet sm" data-act="img" data-pid="' + p.id + '">' + ico('save') + ' Image</button></div></article>').join('') + '</div></section>';
    if (g.loose.length) h += '<section class="sec"><h2>To sort (' + g.loose.length + ')</h2><p class="hint">Tap a photo to tag it Before or After. Then press Pair.</p><div class="grid" style="margin-top:12px">' + g.loose.map((p) => '<button class="ph" data-act="tag" data-id="' + p.id + '" aria-label="Photo, ' + (p.role || 'untagged') + '. Open options."><img alt="" src="' + p.thumb + '"><span class="tag ' + (p.role || '') + '">' + (p.role ? p.role.toUpperCase() : 'UNTAGGED') + '</span></button>').join('') + '</div></section>';
    h += '<section class="sec"><h2>Message to your client</h2><textarea id="msg" rows="3" placeholder="Shown at the top of the gallery">' + esc(cur.message || '') + '</textarea><div class="row"><button class="btn sm" data-act="aimsg">Write it for me</button></div></section>' +
      (cur.notes ? '<section class="sec card"><h2>Job notes</h2><p>' + esc(cur.notes) + '</p></section>' : '') + timelineHtml +
      '<div class="dock"><div class="dock-in"><button class="btn" data-act="cam-before">' + ico('cam') + ' Before</button><button class="btn" data-act="cam-after">' + ico('cam') + ' After</button><label class="btn">' + ico('img') + ' Import<input class="files" type="file" accept="image/*" multiple hidden></label><button class="btn' + (g.loose.length > 1 ? ' primary' : '') + '" data-act="pair">' + ico('pair') + ' Pair</button></div></div>';
    app.innerHTML = h; window.scrollTo(0, y); Gallery.initSliders(app, { nudge: false }); updateNet(); renderShare();
  }
  async function renderShare() {
    const el = $('#share'); if (!el || !cur) return; const S = settings(), waiting = (await all('outbox')).some((o) => o.type === 'publish' && o.jobId === cur.id), sh = cur.share, live = publishing && publishing.jobId === cur.id; let h;
    if (live) h = '<h2>Sharing with your client</h2><div class="bar"><i style="width:' + Math.round(publishing.done / publishing.total * 100) + '%"></i></div><p class="hint">Uploading photo ' + Math.min(publishing.done + 1, publishing.total) + ' of ' + publishing.total + '</p>';
    else if (waiting) h = '<h2>Waiting for signal</h2><p class="hint">The link is made automatically when you are back online. Keep working.</p>';
    else if (sh) { const stale = sh.sig !== view.sigNow; h = '<h2>Client link</h2>' + (stale ? '<div class="note warn">You changed this job after sharing. Your client still sees the older version.</div>' : '') + '<div class="url">' + ico('link') + '<span>' + esc(sh.url) + '</span></div><div class="row">' + (stale ? '<button class="btn primary" data-act="sh-make">Update link</button><button class="btn" data-act="sh-copy">Copy link</button>' : '<button class="btn primary" data-act="sh-copy">Copy link</button>') + '<button class="btn" data-act="sh-share">' + ico('share') + ' Share</button><button class="btn" data-act="sh-open">Open</button>' + (okHook(S.hook) ? '<button class="btn quiet" data-act="crm">Send to CRM</button>' : '') + '</div>'; }
    else h = '<h2>Send to your client</h2><p class="hint">One link with a slider for every area. The photos upload once, and the link stays the same if you update it.</p><div class="row"><button class="btn primary" data-act="sh-make">Create client link</button><button class="btn" data-act="sh-open">Preview</button></div>';
    if (health.share === 'tmp') h += '<div class="note warn">This server has no database connected, so links are temporary. Add Upstash Redis to keep them.</div>';
    el.innerHTML = h;
  }

  // ---------- calendar and contact workspace ----------
  let calCursor = new Date(); calCursor.setDate(1); let calSelected = new Date().toISOString().slice(0,10);
  const isoDay = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  async function renderCalendar() {
    cur=null; dropUrls(); const jobs=await all('jobs'), y=calCursor.getFullYear(), m=calCursor.getMonth();
    const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay()), days=[]; for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d);}
    const eventsFor=d=>jobs.filter(j=>j.date===d || j.dueDate===d);
    const cells=days.map(d=>{const key=isoDay(d), ev=eventsFor(key); return '<button class="cal-day '+(d.getMonth()!==m?'muted-day ':'')+(key===isoDay(new Date())?'today ':'')+(key===calSelected?'selected':'')+'" data-act="cal-select" data-date="'+key+'"><span class="day-num">'+d.getDate()+'</span>'+ev.slice(0,2).map(j=>'<span class="cal-event '+(j.dueDate===key?'due':'')+'">'+(j.dueDate===key?'Due · ':'')+esc(j.name)+'</span>').join('')+(ev.length>2?'<span class="cal-event">+'+(ev.length-2)+' more</span>':'')+'</button>';}).join('');
    const selected=jobs.filter(j=>j.date===calSelected||j.dueDate===calSelected).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    app.innerHTML='<div class="page-head"><div><h1>Job calendar</h1><p>Keep scheduled dates, deadlines, and completed work in one place.</p></div><div class="page-tools"><button class="btn" data-act="home">All jobs</button><button class="btn primary" data-act="new">＋ New job</button></div></div><div class="calendar-wrap"><div class="cal-toolbar"><button class="btn" data-act="cal-prev" aria-label="Previous month">‹</button><h2>'+calCursor.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'</h2><button class="btn" data-act="cal-next" aria-label="Next month">›</button></div><div class="cal-grid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<div class="cal-dow">'+d+'</div>').join('')+cells+'</div></div><section class="cal-agenda"><h2>'+esc(fmtDate(calSelected))+' · Schedule</h2>'+(selected.length?selected.map(j=>'<div class="agenda-item"><div><h3>'+esc(j.name)+'</h3><p>'+esc([j.client,j.address].filter(Boolean).join(' · '))+'</p><p>'+ (j.date===calSelected?'Job date':'') +(j.date===calSelected&&j.dueDate===calSelected?' · ':'') +(j.dueDate===calSelected?'Due date':'')+'</p></div><button class="btn" data-act="open" data-id="'+esc(j.id)+'">Open job</button></div>').join(''):'<div class="empty"><b>No jobs on this date</b>Pick another day or create a job with a job date and due date.</div>')+'</section>';
  }
  async function renderContacts() {
    cur=null; dropUrls(); const jobs=await all('jobs'); let saved=[]; try{saved=JSON.parse(localStorage.getItem(contactsKey())||'[]')}catch(e){}
    const map=new Map(); jobs.forEach(j=>{if(j.client){const k=j.client.toLowerCase();const c=map.get(k)||{name:j.client,phone:'',email:'',jobs:[]};c.jobs.push(j);if(j.phone)c.phone=j.phone;map.set(k,c);}}); saved.forEach(c=>{const k=(c.name||'').toLowerCase();if(k){const old=map.get(k)||{name:c.name,phone:'',email:'',jobs:[]};map.set(k,Object.assign(old,c));}});
    const contacts=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
    app.innerHTML='<div class="page-head"><div><h1>Contacts</h1><p>A lightweight customer book built from your jobs. Import device contacts where your browser supports it, or export a CSV for your CRM.</p></div><div class="page-tools"><button class="btn" data-act="contacts-import">Import device contacts</button><button class="btn" data-act="contacts-export">Export CSV</button><button class="btn primary" data-act="contacts-add">＋ Add contact</button></div></div><div class="contact-grid">'+(contacts.length?contacts.map(c=>'<article class="contact-card"><div class="contact-avatar">'+esc(c.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())+'</div><div class="contact-copy"><h3>'+esc(c.name)+'</h3><p>'+esc(c.phone||c.email||'No phone or email saved')+'</p><p>'+c.jobs.length+' linked job'+(c.jobs.length===1?'':'s')+'</p>'+(c.jobs.length?'<button class="btn sm" data-act="open" data-id="'+esc(c.jobs[0].id)+'">Latest job</button>':'')+'</div></article>').join(''):'<div class="empty"><b>No contacts yet</b>Customer names from jobs appear here. Add a contact or import supported device contacts.</div>')+'</div><p class="hint" style="margin-top:18px">Privacy note: contacts are stored locally in this browser. This is not a live sync with your phone address book or CRM.</p>';
  }
  function syncDetails() { all('outbox').then(async items=>{ const jobs=await all('jobs'); const itemsUi=items.map(it=>{const j=jobs.find(x=>x.id===it.jobId);return [(it.type==='publish'?'Publish gallery':'CRM delivery')+' · '+((j&&j.name)||(it.payload&&it.payload.job&&it.payload.job.name)||'Job'),null];}); sheet('Sync & delivery queue', [['Connection: '+(navigator.onLine?'Online':'Offline'),null],['Queued actions: '+items.length,null]].concat(itemsUi).concat([['Retry queued actions',()=>flush()],['Open settings / CRM',()=>openSettings()],['Done',null]])); }); }
  async function contactsImport() {
    if(navigator.contacts && navigator.contacts.select) { try {const picked=await navigator.contacts.select(['name','tel','email'],{multiple:true});let saved=[];try{saved=JSON.parse(localStorage.getItem(contactsKey())||'[]')}catch(e){};picked.forEach(c=>saved.push({name:(c.name||[])[0]||'Contact',phone:(c.tel||[])[0]||'',email:(c.email||[])[0]||''}));localStorage.setItem(contactsKey(),JSON.stringify(saved));toast('Imported '+picked.length+' contact(s).');return renderContacts();}catch(e){toast('Contact picker cancelled or unavailable.');return;} }
    sheet('Import contacts',[['Choose a CSV file',()=>{const i=document.createElement('input');i.type='file';i.accept='.csv,text/csv';i.onchange=async()=>{const f=i.files[0];if(!f)return;const lines=(await f.text()).split(/\r?\n/).filter(Boolean);const rows=lines.slice(1).map(line=>line.split(',').map(x=>x.trim().replace(/^"|"$/g,''))).filter(x=>x[0]);let saved=[];try{saved=JSON.parse(localStorage.getItem(contactsKey())||'[]')}catch(e){};rows.forEach(r=>saved.push({name:r[0],phone:r[1]||'',email:r[2]||''}));localStorage.setItem(contactsKey(),JSON.stringify(saved));toast('Imported '+rows.length+' contacts.');renderContacts();};i.click();}],['Cancel',null]]);
  }
  async function contactsExport() { const jobs=await all('jobs');let saved=[];try{saved=JSON.parse(localStorage.getItem(contactsKey())||'[]')}catch(e){};const m=new Map();jobs.forEach(j=>{if(j.client){const k=j.client.toLowerCase();if(!m.has(k))m.set(k,{name:j.client,phone:j.phone||'',email:''});}});saved.forEach(c=>{if(c.name)m.set(c.name.toLowerCase(),c)});const csv=['Name,Phone,Email',...[...m.values()].map(c=>[c.name,c.phone,c.email].map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(','))].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='rinse-contacts.csv';a.click();toast('Contacts exported.'); }
  function addContact() { const name=prompt('Contact name');if(!name||!name.trim())return;const phone=prompt('Phone (optional)')||'',email=prompt('Email (optional)')||'';let saved=[];try{saved=JSON.parse(localStorage.getItem(contactsKey())||'[]')}catch(e){};saved.push({name:name.trim(),phone:phone.trim(),email:email.trim()});localStorage.setItem(contactsKey(),JSON.stringify(saved));renderContacts(); }

  // ---------- actions ----------
  const pairOf = async (pid) => groupPairs(await photosOf(cur.id)).pairs.find((p) => p.id === pid);
  async function openJob(id) { cur = await getJob(id); await renderJob(); window.scrollTo(0, 0); }
  // ---------- workspaces: your own jobs vs the sample demo ----------
  const DEMO_ASSETS = []; for (let n = 1; n <= 11; n++) DEMO_ASSETS.push('/paired-photos/' + n + '-1.jpg', '/paired-photos/' + n + '-2.jpg');
  function precacheDemoAssets() {
    if (!('caches' in window)) return;
    caches.open('rinse-demo-v1').then((c) => Promise.all(DEMO_ASSETS.map((u) => c.add(u).catch(() => {})))).catch(() => {});
  }
  function updateBanner() {
    const b = $('#demo-banner'); if (!b) return;
    b.hidden = mode() !== 'demo';
    document.body.classList.toggle('is-demo', mode() === 'demo');
  }
  async function seedDemo(announce) {
    try {
      if (await demoReady()) { if (announce) toast('Demo workspace: 11 sample jobs.'); precacheDemoAssets(); return; }
      progress('Loading sample jobs…');
      await ensureDemoWorkspace(true);
      progress();
      await renderHome();
      precacheDemoAssets();
      if (announce) toast('Demo ready: 11 sample jobs.');
    } catch (e) {
      progress();
      toast('Some sample photos could not load. Reset the demo to try again.', 5000);
    }
  }
  async function enterDemo(reset) {
    cur = null; setMode('demo');
    if (reset) { if (db) { try { db.close(); } catch (e) {} db = null; } await deleteDb('rinse-demo'); }
    await open();
    updateBanner();
    await renderHome();
    await seedDemo(true);
  }
  async function exitDemo() {
    cur = null; setMode('live');
    await open();
    updateBanner();
    await renderHome();
    toast('Back to your own jobs.');
  }
  async function startDemo() { await enterDemo(false); if (await getJob('demo-01')) await openJob('demo-01'); }
  function jobDialog(job) {
    const d = $('#jdlg'); $('#j-title').textContent = job ? 'Edit job' : 'New job'; $('#j-name').value = job ? job.name : ''; $('#j-client').value = job ? job.client || '' : ''; $('#j-addr').value = job ? job.address || '' : ''; $('#j-date').value = job ? job.date || new Date().toISOString().slice(0,10) : new Date().toISOString().slice(0,10); $('#j-due').value = job ? job.dueDate || '' : ''; $('#j-notes').value = job ? job.notes || '' : ''; d.dataset.id = job ? job.id : ''; d.returnValue = ''; d.showModal();
  }
  async function importMany(files) {
    const fs = [].slice.call(files || []); if (!fs.length) return; let n = 0, bad = 0;
    for (let i = 0; i < fs.length; i++) { progress('Adding photo ' + (i + 1) + ' of ' + fs.length + '…'); try { await put('photos', await importFile(fs[i], cur.id)); n++; } catch (e) { bad++; } }
    progress(); toast(n + (n === 1 ? ' photo added.' : ' photos added.') + (bad ? ' ' + bad + ' could not be read.' : '') + (n > 1 ? ' Press Pair.' : ''), 4000); renderJob();
  }
  async function onAct(act, el) {
    const pid = el.dataset.pid, id = el.dataset.id;
    if (act === 'new') return jobDialog(null);
    if (act === 'demo') return startDemo();
    if (act === 'mode-demo') return enterDemo(false);
    if (act === 'mode-live') return exitDemo();
    if (act === 'demo-reset') return enterDemo(true);
    if (act === 'open') return openJob(id);
    if (act === 'home') return renderHome('all');
    if (act === 'calendar') return renderCalendar();
    if (act === 'contacts') return renderContacts();
    if (act === 'filter-sync') return renderHome('sync');
    if (act === 'sync-details') return syncDetails();
    if (act === 'cal-prev') { calCursor.setMonth(calCursor.getMonth()-1); return renderCalendar(); }
    if (act === 'cal-next') { calCursor.setMonth(calCursor.getMonth()+1); return renderCalendar(); }
    if (act === 'cal-select') { calSelected=el.dataset.date; return renderCalendar(); }
    if (act === 'contacts-import') return contactsImport();
    if (act === 'contacts-export') return contactsExport();
    if (act === 'contacts-add') return addContact();
    if (act === 'filter-ready') return renderHome('ready');
    if (act === 'filter-all') return renderHome('all');
    if (act === 'cam-before') return openCamera('before');
    if (act === 'cam-after') { const g = groupPairs(await photosOf(cur.id)); return openCamera('after', g.loose.filter((p) => p.role === 'before')); }
    if (act === 'pair') return smartPair(false);
    if (act === 'retake') { const p = await pairOf(pid); if (p) openCamera('after', [p.before]); return; }
    if (act === 'swap') { const p = await pairOf(pid); if (!p) return; p.before.role = 'after'; p.after.role = 'before'; p.before.cap = p.after.cap; p.after.cap = ''; await put('photos', p.before); await put('photos', p.after); return renderJob(); }
    if (act === 'unpair') { const p = await pairOf(pid); if (!p) return; p.before.pairId = p.after.pairId = null; await put('photos', p.before); await put('photos', p.after); return renderJob(); }
    if (act === 'img') return shareImage(pid);
    if (act === 'tag') { const p = (await photosOf(cur.id)).find((q) => q.id === id); if (!p) return; const set = (r) => async () => { p.role = r; p.pairId = null; await put('photos', p); renderJob(); };
      return sheet('This photo is…', [['Before (dirty)', set('before')], ['After (clean)', set('after')], ['Not sure yet', set(null)], ['Delete photo', async () => { await del('photos', p.id); renderJob(); }, 'danger']]); }
    if (act === 'aimsg') { const n = groupPairs(await photosOf(cur.id)).pairs.length; let m = '';
      if (navigator.onLine && health.ai) { progress('Writing…'); try { m = (await api('api/pair', { task: 'message', job: cur.name, client: cur.client, pairs: n })).message; } catch (e) {} progress(); }
      cur.message = m || defaultMessage(cur, n); cur.autoMsg = true; await put('jobs', cur); return renderJob(); }
    if (act === 'sh-make') return queuePublish();
    if (act === 'sh-open') return preview();
    if (act === 'sh-copy') { const u = cur.share.url; return (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copied.'), () => prompt('Copy this link', u)); }
    if (act === 'sh-share') { const u = cur.share.url; if (navigator.share) return navigator.share({ title: cur.name, text: 'Before and after photos of your ' + cur.name, url: u }).catch(() => {}); return onAct('sh-copy', el); }
    if (act === 'crm') return sendCRM();
    if (act === 'more') return sheet(cur.name, [['Edit name, client, address', () => jobDialog(cur)], ['Pair everything again', async () => { if (confirm('Break all pairs and match again? Your captions stay with their photos.')) smartPair(true); }], ['Preview gallery on this phone', preview], ['Download gallery as a file', downloadFile], ['Send to CRM', sendCRM],
      ['Delete job', async () => { if (!confirm('Delete "' + cur.name + '" and its photos from this phone? A client link that was already shared keeps working.')) return; for (const p of await photosOf(cur.id)) await del('photos', p.id); for (const o of await all('outbox')) if (o.jobId === cur.id) await del('outbox', o.id); await del('jobs', cur.id); renderHome(); }, 'danger']]);
  }

  // ---------- settings ----------
  let pendingLogo;
  function applyTheme(t) { document.documentElement.dataset.theme = t === 'system' ? '' : t; }
  function openSettings() {
    const S = settings(); pendingLogo = S.logo || ''; $('#s-biz').value = S.business || ''; $('#s-phone').value = S.phone || ''; $('#s-contact').value = S.contact || ''; $('#s-review').value = S.review || ''; $('#s-hook').value = S.hook || ''; $('#s-auto').checked = !!S.autoCrm;
    $('#s-colors').innerHTML = COLORS.map((c) => '<label><input type="radio" name="color" value="' + c + '"' + ((S.color || COLORS[0]) === c ? ' checked' : '') + '><span style="background:' + c + '" title="' + c + '"></span></label>').join('');
    $('#s-theme input[value="' + (S.theme || 'system') + '"]').checked = true;
    logoUi(); $('#s-ai').textContent = health.ai ? 'AI matching is on (' + health.model + '). Pairing also works offline on this phone.' : 'AI matching is off right now. Photos are still paired on this phone.'; $('#dlg').showModal();
  }
  function logoUi() { $('#s-logo-img').hidden = !pendingLogo; $('#s-logo-clear').hidden = !pendingLogo; if (pendingLogo) $('#s-logo-img').src = pendingLogo; }

  // ---------- boot ----------
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); onAct(b.dataset.act, b).catch((er) => { progress(); toast('Something went wrong. Try again.'); console.error(er); }); } });
  const banner = $('#demo-banner');
  if (banner) banner.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); onAct(b.dataset.act, b).catch((er) => { progress(); toast('Something went wrong. Try again.'); console.error(er); }); } });
  app.addEventListener('change', async (e) => {
    if (e.target.classList.contains('files')) { const f = e.target.files; await importMany(f); e.target.value = ''; return; }
    if (e.target.id === 'msg') { cur.message = e.target.value.slice(0, 600); cur.autoMsg = false; await put('jobs', cur); return renderShare(); }
    if (e.target.classList.contains('cap')) { const pr = await pairOf(e.target.closest('.pair').dataset.pid); if (pr) { pr.after.cap = e.target.value.trim().slice(0, 60); await put('photos', pr.after); const g = groupPairs(await photosOf(cur.id)); view.sigNow = pairSig(cur, g.pairs, settings()); renderShare(); } }
  });
  $('#home-link').onclick = (e) => { e.preventDefault(); renderHome('all'); }; $('#calendar-top').onclick = () => renderCalendar(); $('#contacts-top').onclick = () => renderContacts(); $('#settings').onclick = openSettings;
  $('#net').onclick = () => { toast(navigator.onLine ? 'Syncing…' : 'Still offline. Rinse will sync when the signal returns.'); flush(); };
  ['#dlg', '#sheet', '#jdlg'].forEach((s) => $(s).addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }));
  $('#s-logo').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const b = await decode(f); pendingLogo = scale(b, b.width, b.height, 256, .9).url('image/png'); logoUi(); } catch (er) { toast('Could not read that image.'); } e.target.value = ''; };
  $('#s-logo-clear').onclick = () => { pendingLogo = ''; logoUi(); };
  $('#s-test').onclick = async () => { const u = $('#s-hook').value.trim(); if (!okHook(u)) { toast('Enter an https:// webhook address first.'); return; } if (!navigator.onLine) { toast('You are offline.'); return; }
    try { await postHook(u, { event: 'rinse_test', business: $('#s-biz').value.trim(), job: { id: 'test', name: 'Test job', client: 'Test client', address: '1 Example St', date: new Date().toISOString().slice(0, 10) }, photos: 8, pairs: 4, areas: 'Driveway, Deck', message: 'This is a test from Rinse.', gallery_url: 'https://example.com/g/test', sent_at: new Date().toISOString() }); toast('Test sent. Check your Zap or scenario history.', 4500); } catch (e) { toast('Could not reach that address.'); } };
  $('#set-form').onsubmit = (e) => { if (e.submitter && e.submitter.value === 'ok') { const col = ($('#s-colors input:checked') || {}).value || COLORS[0];
    const theme = ($('#s-theme input:checked') || {}).value || 'system';
    localStorage.setItem('rinse.settings', JSON.stringify({ business: $('#s-biz').value.trim().slice(0, 80), phone: $('#s-phone').value.trim().slice(0, 30), contact: $('#s-contact').value.trim().slice(0, 120), review: $('#s-review').value.trim().slice(0, 300), color: col, logo: pendingLogo || '', hook: $('#s-hook').value.trim().slice(0, 500), autoCrm: $('#s-auto').checked, theme })); applyTheme(theme); toast('Saved.'); flush(); if (cur) renderJob(); } };
  $('#j-form').onsubmit = async (e) => { if (!(e.submitter && e.submitter.value === 'ok')) return; const d = $('#jdlg'), name = $('#j-name').value.trim(); if (!name) { e.preventDefault(); $('#j-name').focus(); return; }
    const old = d.dataset.id ? await getJob(d.dataset.id) : null, job = old || { id: uid(), date: new Date().toISOString().slice(0, 10), created: Date.now(), message: '' };
    job.name = name.slice(0, 80); job.client = $('#j-client').value.trim().slice(0, 80); job.address = $('#j-addr').value.trim().slice(0, 120); job.date = $('#j-date').value || new Date().toISOString().slice(0,10); job.dueDate = $('#j-due').value || ''; job.notes = $('#j-notes').value.trim().slice(0,240); await put('jobs', job); if (old) { cur = job; renderJob(); } else openJob(job.id); };
  window.addEventListener('online', () => { updateNet(); flush(); }); window.addEventListener('offline', updateNet);
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Deep links: /?demo=1 opens the sample workspace, &reset=1 reseeds it.
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') setMode('demo');
  if (params.has('demo') || params.has('reset')) {
    const clean = location.pathname + (location.hash || '');
    history.replaceState(null, '', clean || '/');
  }
  const demoReset = params.has('demo') && params.get('reset') === '1';
  (async () => {
    if (demoReset) await deleteDb('rinse-demo');
    await open();
    applyTheme(settings().theme || 'system');
    updateBanner();
    if (mode() === 'live') await purgeDemoFromLive();
    await renderHome();
    if (mode() === 'demo') seedDemo(false);
    fetch('api/health').then((r) => r.json()).then((h) => { health = h; if (cur) renderShare(); }).catch(() => {});
    flush();
    setInterval(() => { if (navigator.onLine) flush(); }, 25000);
    window.__rinse = { smartPair: () => smartPair(false), get cur() { return cur; }, health: () => health };
  })().catch((e) => { progress(); console.error(e); app.innerHTML = '<div class="empty"><b>Rinse could not start</b>Reload the page. Your photos are still on this phone.</div>'; });
})();
