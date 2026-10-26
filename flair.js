// Atlas Glacier flair: purely decorative, wrapped so it can never break the app.
(function () {
  'use strict';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, auto = navigator.webdriver;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  // 1. the first time a slider scrolls into view it sweeps once, so people see it drags
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); sweep(e.target); } }); }, { threshold: .6 }) : null;
  function sweep(c) {
    var stop = false, t0 = null; c.addEventListener('pointerdown', function () { stop = true; }, { once: true });
    (function f(t) { if (stop) return; t0 = t0 || t; var k = Math.min(1, (t - t0) / 1500); c.style.setProperty('--p', (50 + 40 * Math.sin(k * 2 * Math.PI)).toFixed(1) + '%'); if (k < 1) requestAnimationFrame(f); else c.style.setProperty('--p', '50%'); })(performance.now());
  }
  function sliders() { if (!io || reduced || auto) return; document.querySelectorAll('#app .cmp:not([data-sw])').forEach(function (c) { c.dataset.sw = '1'; io.observe(c); }); }

  // 2. water drops burst from every primary button
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn.primary'); if (!b || reduced) return;
    for (var i = 0; i < 9; i++) { var d = el('span', 'drop'), a = Math.PI * (1.15 + Math.random() * .7), v = 26 + Math.random() * 38;
      d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; d.style.setProperty('--dx', (Math.cos(a) * v).toFixed(0) + 'px'); d.style.setProperty('--dy', (Math.sin(a) * v + 22).toFixed(0) + 'px'); document.body.append(d); setTimeout(function (x) { x.remove(); }, 700, d); }
  }, true);

  var q = 0; function tick() { cancelAnimationFrame(q); q = requestAnimationFrame(function () { try { sliders(); } catch (e) { /* decorative only */ } }); }
  var app = document.getElementById('app'); if (app) { new MutationObserver(tick).observe(app, { childList: true, subtree: true }); tick(); }
})();
