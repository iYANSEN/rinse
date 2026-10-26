// Atlas Glacier flair: purely decorative, wrapped so it can never break the app.
(function () {
  'use strict';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, auto = navigator.webdriver;
  var RANKS = [[0, 'E'], [1, 'D'], [3, 'C'], [5, 'B'], [8, 'A'], [12, 'S']];
  function rank(n) { var r = RANKS[0], next = null; RANKS.forEach(function (x, i) { if (n >= x[0]) { r = x; next = RANKS[i + 1] || null; } }); return { letter: r[1], next: next }; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function cell(label, value, cls) { var d = el('div'), s = el('small', '', label), b = el('strong', cls || '', value); d.append(s, b); return d; }

  // 1. a game-style "system window" on the home hero (read from what is on screen, nothing stored)
  function statusWindow() {
    var hero = document.querySelector('#app .hero'); if (!hero || hero.querySelector('.status-win')) return;
    var jobs = document.querySelectorAll('#app .job').length, wait = document.querySelectorAll('#app .job .badge.wait').length, r = rank(jobs);
    var w = el('div', 'status-win'), t = el('div', 'ttl'); t.setAttribute('role', 'group'); t.setAttribute('aria-label', 'Crew status');
    t.append(document.createTextNode('[ SYSTEM ] '), Object.assign(el('b'), { textContent: 'CREW STATUS' }));
    w.append(t, cell('JOBS', String(jobs)), cell('RANK', r.letter, 'rank'),
      cell('SYNC', wait ? wait + ' WAITING' : jobs ? 'ALL SAFE' : 'READY'));
    if (r.next) { var hint = el('div', 'ttl', 'NEXT RANK ' + r.next[1] + ' AT ' + r.next[0] + ' JOBS'); hint.style.color = '#8fd9cf'; w.append(hint); }
    hero.append(w);
  }

  // 2. the first time a slider scrolls into view it sweeps once, so people see it drags
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); sweep(e.target); } }); }, { threshold: .6 }) : null;
  function sweep(c) {
    var stop = false, t0 = null; c.addEventListener('pointerdown', function () { stop = true; }, { once: true });
    (function f(t) { if (stop) return; t0 = t0 || t; var k = Math.min(1, (t - t0) / 1500); c.style.setProperty('--p', (50 + 40 * Math.sin(k * 2 * Math.PI)).toFixed(1) + '%'); if (k < 1) requestAnimationFrame(f); else c.style.setProperty('--p', '50%'); })(performance.now());
  }
  function sliders() { if (!io || reduced || auto) return; document.querySelectorAll('#app .cmp:not([data-sw])').forEach(function (c) { c.dataset.sw = '1'; io.observe(c); }); }

  // 3. water drops burst from every primary button
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn.primary'); if (!b || reduced) return;
    for (var i = 0; i < 9; i++) { var d = el('span', 'drop'), a = Math.PI * (1.15 + Math.random() * .7), v = 26 + Math.random() * 38;
      d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.setProperty('--dx', (Math.cos(a) * v).toFixed(0) + 'px'); d.style.setProperty('--dy', (Math.sin(a) * v + 22).toFixed(0) + 'px'); document.body.append(d); setTimeout(function (x) { x.remove(); }, 700, d); }
  }, true);

  var q = 0; function tick() { cancelAnimationFrame(q); q = requestAnimationFrame(function () { try { statusWindow(); sliders(); } catch (e) { /* decorative only */ } }); }
  var app = document.getElementById('app'); if (app) { new MutationObserver(tick).observe(app, { childList: true, subtree: true }); tick(); }
})();
