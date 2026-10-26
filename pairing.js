/* Rinse pairing: matches each BEFORE photo to the AFTER photo of the same spot, offline.
 *
 * Why not just "first half = before"? Crews shoot 20-40 photos per job, often interleaved
 * (before A, after A, before B...). Time order alone breaks. Instead we compare a tiny,
 * brightness-invariant fingerprint of each photo (the layout of the scene survives a wash:
 * the house, the fence and the driveway edge stay put even when the grime is gone), then use
 * time only to decide which of two matched photos is the "before" (the earlier one).
 *
 * Works in the browser (window.Pairing) and in Node (require) so it can be unit-tested.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pairing = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = 32, H = 24, SHIFT = 2;

  // rgba: Uint8ClampedArray of a W x H image. Returns a z-scored, lightly blurred grayscale vector.
  function signature(rgba) {
    var n = W * H, g = new Float32Array(n), i, x, y;
    for (i = 0; i < n; i++) g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    var b = new Float32Array(n); // 3x3 box blur: tolerates hand-held shifts and sensor noise
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var s = 0, c = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var xx = x + dx, yy = y + dy; if (xx >= 0 && xx < W && yy >= 0 && yy < H) { s += g[yy * W + xx]; c++; }
      }
      b[y * W + x] = s / c;
    }
    var mean = 0; for (i = 0; i < n; i++) mean += b[i]; mean /= n;
    var v = 0; for (i = 0; i < n; i++) v += (b[i] - mean) * (b[i] - mean);
    var sd = Math.sqrt(v / n) || 1;
    for (i = 0; i < n; i++) b[i] = (b[i] - mean) / sd; // brightness/contrast invariant
    return b;
  }

  // Best Pearson-style correlation over small x/y shifts (photos are never framed identically).
  function similarity(a, b) {
    var best = -1;
    for (var sy = -SHIFT; sy <= SHIFT; sy++) for (var sx = -SHIFT; sx <= SHIFT; sx++) {
      var sum = 0, cnt = 0;
      for (var y = Math.max(0, sy); y < Math.min(H, H + sy); y++) for (var x = Math.max(0, sx); x < Math.min(W, W + sx); x++) {
        sum += a[y * W + x] * b[(y - sy) * W + (x - sx)]; cnt++;
      }
      var r = sum / cnt; if (r > best) best = r;
    }
    return best;
  }

  // photos: [{id, t, role: 'before'|'after'|null, sig}] -> {roles:{id:role}, pairs:[[beforeId, afterId, score]], method}
  // opts.threshold: minimum similarity to accept a match (default 0.6).
  function pairUp(photos, opts) {
    opts = opts || {};
    var thr = opts.threshold == null ? 0.6 : opts.threshold;
    var ps = photos.filter(function (p) { return p.sig; });
    var cand = [], i, j;
    for (i = 0; i < ps.length; i++) for (j = i + 1; j < ps.length; j++) {
      var a = ps[i], b = ps[j];
      if (a.role && b.role && a.role === b.role) continue; // user said both are "before": never pair them
      cand.push({ a: a, b: b, s: similarity(a.sig, b.sig) });
    }
    cand.sort(function (x, y) { return y.s - x.s; });
    var used = {}, pairs = [], roles = {};
    photos.forEach(function (p) { if (p.role) roles[p.id] = p.role; });
    cand.forEach(function (c) {
      if (c.s < thr || used[c.a.id] || used[c.b.id]) return;
      var o = orient(c.a, c.b), before = o[0], after = o[1];
      used[c.a.id] = used[c.b.id] = true; roles[before.id] = 'before'; roles[after.id] = 'after';
      pairs.push([before.id, after.id, Math.round(c.s * 100) / 100]);
    });
    pairs.sort(function (x, y) { return byId(photos, x[0]).t - byId(photos, y[0]).t; });
    return { roles: roles, pairs: pairs, method: 'similarity' };
  }
  // Decide which photo is the before: an explicit tag wins, otherwise the earlier shot.
  function orient(a, b) {
    if (a.role === 'before' || b.role === 'after') return [a, b];
    if (a.role === 'after' || b.role === 'before') return [b, a];
    return a.t <= b.t ? [a, b] : [b, a];
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return { t: 0 }; }

  // Last resort when fingerprints can't be computed: roles by time (first half before), zipped in order.
  function timeOrder(photos) {
    var ps = photos.slice().sort(function (a, b) { return a.t - b.t; }), roles = {}, pairs = [];
    ps.forEach(function (p, i) { roles[p.id] = p.role || (i < ps.length / 2 ? 'before' : 'after'); });
    var bs = ps.filter(function (p) { return roles[p.id] === 'before'; }), as = ps.filter(function (p) { return roles[p.id] === 'after'; });
    for (var i = 0; i < Math.min(bs.length, as.length); i++) pairs.push([bs[i].id, as[i].id, 0]);
    return { roles: roles, pairs: pairs, method: 'time' };
  }

  return { W: W, H: H, signature: signature, similarity: similarity, pairUp: pairUp, timeOrder: timeOrder };
});
