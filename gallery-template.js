/* Rinse client gallery: ONE template used for the hosted link (/g/:id) and for the offline single-file export.
 * Design follows DESIGN.md (adapted from VoltAgent/awesome-design-md "airbnb"): white canvas, ink text, hairlines,
 * photo-first 14px cards, one accent colour (the business's own) reserved for the primary action.
 *
 * Gallery.render(data, opts) -> full HTML string
 *   data = { title, address, date, message, business, phone, contact, color, logo, review,
 *            pairs: [{ b: <before src>, a: <after src>, cap }] }
 *   opts = { fontUrl, og: { url, image }, brandLine: bool }
 * Gallery.initSliders(rootElement) is also used by the in-app preview sliders.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Gallery = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var safeColor = function (c) { return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#0a7a79'; };
  var safeHttps = function (u) { return /^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : ''; };
  var safePhone = function (p) { var d = String(p || '').replace(/[^\d+]/g, ''); return d.length >= 7 ? d : ''; };
  var safeImg = function (u) { return /^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+|\/g\/[A-Za-z0-9_\-\/.]+|blob:[^\s"'<>]+)$/.test(u || '') ? u : ''; };

  // Drag-to-compare. Pointer events so horizontal drags move the divider while vertical swipes still scroll the page.
  function initSliders(rootEl, o) {
    var reduce = (o && o.nudge === false) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    rootEl.querySelectorAll('.cmp').forEach(function (el, idx) {
      var input = el.querySelector('input'), down = false, moved = false, sx = 0;
      function set(p) { p = Math.max(0, Math.min(100, p)); el.style.setProperty('--p', p + '%'); if (input) input.value = Math.round(p); }
      function at(e) { var r = el.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); el.classList.add('touched'); }
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        down = true; moved = false; sx = e.clientX; try { el.setPointerCapture(e.pointerId); } catch (x) {}
        if (e.pointerType === 'mouse') at(e);
      });
      el.addEventListener('pointermove', function (e) {
        if (!down) return;
        if (e.pointerType !== 'mouse' && !moved && Math.abs(e.clientX - sx) < 4) return;
        moved = true; at(e);
      });
      function up(e) { if (down && !moved && e.type === 'pointerup' && e.pointerType !== 'mouse') at(e); down = false; }
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      if (input) input.addEventListener('input', function () { set(+input.value); el.classList.add('touched'); });
      // One orchestrated moment: the first slider sweeps once to show it is draggable.
      if (idx === 0 && !reduce && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return; io.disconnect();
          var t0 = performance.now(), D = 1800;
          (function step(now) {
            if (el.classList.contains('touched')) return;
            var k = Math.min(1, (now - t0) / D), v = 50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k * .3);
            set(v); if (k < 1) requestAnimationFrame(step); else set(50);
          })(t0);
        }, { threshold: 0.6 });
        io.observe(el);
      }
    });
  }

  var CSS = [
    ':root{--brand:#0a7a79;--ink:#222;--body:#3f3f3f;--muted:#6a6a6a;--hair:#ddd;--soft:#f7f7f7;--bg:#fff;--before:#c2410c;--after:#0a7d46;--sans:Figtree,-apple-system,"SF Pro Text",system-ui,Roboto,"Helvetica Neue",sans-serif;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--ink:#f2f2f2;--body:#d6d6d6;--muted:#a3a3a3;--hair:#3a3a3a;--soft:#1c1c1c;--bg:#101010}}',
    '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--body);font:400 16px/1.5 var(--sans)}',
    'a{color:inherit}.wrap{max-width:1080px;margin:0 auto;padding:0 20px}',
    'header.top{border-bottom:1px solid var(--hair)}header.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}',
    '.biz{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1rem;color:var(--ink);min-width:0}.biz img{width:36px;height:36px;border-radius:8px;object-fit:cover;flex:none}.biz span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:8px;border:1px solid var(--hair);background:var(--bg);color:var(--ink);font:600 .95rem var(--sans);text-decoration:none}.pill{white-space:nowrap;flex:none}.pill .num{display:none}@media (min-width:600px){.pill .num{display:inline;margin-left:.4em}}.pill:hover{background:var(--soft)}.pill:focus-visible,.cta:focus-visible{outline:3px solid var(--ink);outline-offset:2px}',
    '.cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:8px;background:var(--brand);color:#fff;font:600 1rem var(--sans);text-decoration:none}.cta:hover{filter:brightness(.92)}',
    '.intro{padding:32px 0 8px}h1{margin:0;font:700 clamp(1.5rem,4.5vw,1.75rem)/1.25 var(--sans);color:var(--ink);letter-spacing:-.01em}',
    '.meta{margin:6px 0 0;color:var(--muted);font-size:.95rem}.count{display:inline-block;margin-top:14px;padding:5px 12px;border:1px solid var(--hair);border-radius:999px;font-weight:600;font-size:.85rem;color:var(--ink)}',
    '.msg{margin:20px 0 0;max-width:62ch;font-size:1.125rem;line-height:1.55;color:var(--ink)}',
    '.pairs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:24px 16px;margin:28px 0 8px}.pairs>figure:first-child{grid-column:1/-1}',
    'figure{margin:0}figcaption{display:flex;justify-content:space-between;gap:12px;padding:10px 2px 0;font-weight:600;color:var(--ink)}figcaption small{font-weight:400;color:var(--muted)}',
    '.cmp{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:var(--soft);--p:50%;touch-action:pan-y;cursor:ew-resize;user-select:none;-webkit-user-select:none;box-shadow:0 0 0 1px rgba(0,0,0,.02),0 2px 6px rgba(0,0,0,.04),0 4px 8px rgba(0,0,0,.10)}',
    'figure:first-child .cmp{aspect-ratio:16/10}@media (max-width:560px){figure:first-child .cmp{aspect-ratio:4/3}}',
    '.cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}.cmp .b{clip-path:inset(0 calc(100% - var(--p)) 0 0)}',
    '.cmp .line{position:absolute;top:0;bottom:0;left:var(--p);width:3px;margin-left:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12)}',
    '.cmp .knob{position:absolute;top:50%;left:var(--p);width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:#fff;color:#222;display:grid;place-items:center;box-shadow:0 2px 10px rgba(0,0,0,.35)}',
    '.cmp .tag{position:absolute;top:12px;padding:4px 10px;border-radius:999px;color:#fff;font:700 .75rem/1 var(--sans);letter-spacing:.02em}.tag.l{left:12px;background:var(--before)}.tag.r{right:12px;background:var(--after)}',
    '.cmp input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;pointer-events:none}.cmp:focus-within{outline:3px solid var(--ink);outline-offset:2px}',
    '.hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;font:600 .8rem var(--sans);transition:opacity .3s;pointer-events:none}.cmp.touched .hint{opacity:0}',
    '.review{margin:40px 0 0;padding:28px 0;border-top:1px solid var(--hair);display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}.review h2{margin:0;font:600 1.25rem/1.3 var(--sans);color:var(--ink)}.review p{margin:4px 0 0;color:var(--muted)}',
    'footer{padding:20px 0 40px;color:var(--muted);font-size:.9rem;border-top:1px solid var(--hair)}footer .wrap{display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}',
    'header.top{position:relative;border-bottom:0}header.top::after{content:"";position:absolute;left:0;right:0;bottom:0;height:10px;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 44 44\'%3E%3Cg fill=\'none\' stroke=\'%23fff\' stroke-opacity=\'.5\'%3E%3Crect x=\'11\' y=\'11\' width=\'22\' height=\'22\'/%3E%3Crect x=\'11\' y=\'11\' width=\'22\' height=\'22\' transform=\'rotate(45 22 22)\'/%3E%3Ccircle cx=\'22\' cy=\'22\' r=\'3.2\'/%3E%3C/g%3E%3C/svg%3E") 0 -17px/44px 44px,linear-gradient(90deg,var(--brand),#19d3a2)}',
    '.intro{position:relative}.intro::after{content:"";position:absolute;right:0;top:26px;width:84px;height:84px;background:var(--brand);opacity:.13;pointer-events:none;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect x=\'14\' y=\'14\' width=\'72\' height=\'72\'/%3E%3Crect x=\'14\' y=\'14\' width=\'72\' height=\'72\' transform=\'rotate(45 50 50)\'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect x=\'14\' y=\'14\' width=\'72\' height=\'72\'/%3E%3Crect x=\'14\' y=\'14\' width=\'72\' height=\'72\' transform=\'rotate(45 50 50)\'/%3E%3C/svg%3E") center/contain no-repeat}',
    '.count{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.03em;font-size:.8rem;box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 10%,transparent)}.count::before{content:"\\25A3  "}',
    '.cmp{box-shadow:0 0 0 1px rgba(0,0,0,.02),0 2px 6px rgba(0,0,0,.04),0 18px 36px -16px color-mix(in srgb,var(--brand) 55%,transparent)}.cmp .knob{box-shadow:0 0 0 4px rgba(25,211,162,.35),0 2px 10px rgba(0,0,0,.35);animation:ping 2.6s ease-out infinite}@keyframes ping{70%,100%{box-shadow:0 0 0 14px rgba(25,211,162,0),0 2px 10px rgba(0,0,0,.35)}}.cmp .line{box-shadow:0 0 12px rgba(255,255,255,.9),0 0 0 1px rgba(0,0,0,.12)}',
    'footer .wrap span:last-child::after{content:" \\00b7  Crafted in Settat, Morocco"}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
  ].join('\n');

  function render(g, opts) {
    opts = opts || {}; g = g || {};
    var color = safeColor(g.color), pairs = g.pairs || [], n = pairs.length, phone = safePhone(g.phone), review = safeHttps(g.review), logo = safeImg(g.logo);
    var biz = g.business || 'Your before & after photos';
    var font = opts.fontUrl ? '@font-face{font-family:Figtree;font-weight:300 900;font-display:swap;src:url("' + esc(opts.fontUrl) + '") format("woff2")}' : '';
    var figs = pairs.map(function (p, i) {
      var cap = p.cap || 'Area ' + (i + 1), b = safeImg(p.b), a = safeImg(p.a);
      return '<figure><div class="cmp" role="group" aria-label="' + esc(cap) + ': compare before and after">' +
        '<img src="' + a + '" alt="' + esc(cap) + ' after" decoding="async"' + (i > 1 ? ' loading="lazy"' : '') + '>' +
        '<img class="b" src="' + b + '" alt="' + esc(cap) + ' before" decoding="async"' + (i > 1 ? ' loading="lazy"' : '') + '>' +
        '<span class="tag l">Before</span><span class="tag r">After</span><div class="line"></div>' +
        '<div class="knob" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></div>' +
        (i === 0 ? '<div class="hint">Drag to compare</div>' : '') +
        '<input type="range" min="0" max="100" value="50" aria-label="Compare before and after: ' + esc(cap) + '"></div>' +
        '<figcaption><span>' + esc(cap) + '</span>' + (n > 1 ? '<small>' + (i + 1) + ' of ' + n + '</small>' : '') + '</figcaption></figure>';
    }).join('');
    var meta = [g.address, g.date].filter(Boolean).map(esc).join(' \u00b7 ');
    var head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<title>' + esc(g.title || 'Before & after') + ' \u2013 ' + esc(biz) + '</title><meta name="robots" content="noindex">' + '<meta name="theme-color" content="' + color + '">' +
      (opts.og ? '<meta property="og:title" content="' + esc((g.title || 'Before & after') + ' \u2013 ' + biz) + '"><meta property="og:description" content="' + esc(n + (n === 1 ? ' area' : ' areas') + ' transformed. Slide to compare.') + '"><meta property="og:type" content="website">' +
        (opts.og.url ? '<meta property="og:url" content="' + esc(opts.og.url) + '">' : '') + (opts.og.image ? '<meta property="og:image" content="' + esc(opts.og.image) + '"><meta name="twitter:card" content="summary_large_image">' : '') : '') +
      '<style>' + font + CSS + ':root{--brand:' + color + '}</style></head><body>';
    var body = '<header class="top"><div class="wrap"><div class="biz">' + (logo ? '<img src="' + logo + '" alt="">' : '') + '<span>' + esc(biz) + '</span></div>' +
      (phone ? '<a class="pill" href="tel:' + phone + '">Call<span class="num">' + esc(g.phone && g.phone.length < 20 ? g.phone : '') + '</span></a>' : '') + '</div></header>' +
      '<main class="wrap"><section class="intro"><h1>' + esc(g.title || 'Your before & after') + '</h1>' + (meta ? '<p class="meta">' + meta + '</p>' : '') +
      '<span class="count">' + n + (n === 1 ? ' area' : ' areas') + ' transformed</span>' + (g.message ? '<p class="msg">' + esc(g.message) + '</p>' : '') + '</section>' +
      '<section class="pairs" aria-label="Before and after photos">' + figs + '</section>' +
      (review ? '<section class="review"><div><h2>Happy with the result?</h2><p>A quick review helps a small business a lot.</p></div><a class="cta" href="' + esc(review) + '" rel="noopener">Leave a review</a></section>' : '') +
      '</main><footer><div class="wrap"><span>' + (g.contact ? esc(g.contact) : esc(biz)) + '</span>' + (opts.brandLine === false ? '' : '<span>Photos organised with Rinse</span>') + '</div></footer>';
    var script = '<script>(' + initSliders.toString() + ')(document)<\/script>';
    return head + body + script + '</body></html>';
  }

  return { render: render, initSliders: initSliders, esc: esc, safeColor: safeColor, safeHttps: safeHttps, safePhone: safePhone, safeImg: safeImg };
});
