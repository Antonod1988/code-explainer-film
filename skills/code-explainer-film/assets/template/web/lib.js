// lib.js: palette, spline paths, tapered strokes, small ornaments, keyframe tracks and the woven grain.
'use strict';
const W = 1920, H = 1080;
const INK = '#17100c';
const LINE = 3.2;
const C = {
  ink: INK,
  wall: '#2b1c15', wall2: '#3a291f', wall3: '#4a3528',
  night: '#16313a', night2: '#1d414a', night3: '#0f242c', chalk: '#7d9a93', chalk2: '#4a6a6a',
  brick: '#8f2f18', brick2: '#b0451f', brick3: '#6e2212', cream: '#d3c4a6', cream2: '#b7a583',
  rose: '#8c3c44', rose2: '#b06a6e', rose3: '#6b2a33',
  saffron: '#c8821f', saffron2: '#a96a17', gold: '#dca62e', gold2: '#f0c95a', gold3: '#9c6a18',
  teal: '#1c645c', teal2: '#134a45', teal3: '#2b8074', slate: '#3c4c4c',
  skin: '#ece2d2', skin2: '#cbbba4', blush: '#e4a896',
  hair: '#7a4a26', hair2: '#5c3418', hair3: '#9c6a38',
  parch: '#d6ccbc', parch2: '#b8ab96', parch3: '#e9e2d6', khaki: '#9c846c', khaki2: '#7c6444',
  olive: '#4c4434', olive2: '#5c5240', wood: '#34241c', wood2: '#4a3426', wood3: '#6a4c34',
};

const rad = (d) => d * Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const step = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
const EASE = {
  l: (u) => u,
  io: (u) => u * u * (3 - 2 * u),
  o: (u) => 1 - Math.pow(1 - u, 3),
  o2: (u) => 1 - Math.pow(1 - u, 2),
  i: (u) => u * u * u,
  i2: (u) => u * u,
  b: (u) => { const s = 1.6; u -= 1; return u * u * ((s + 1) * u + s) + 1; },
  h: () => 0,
};
const mix = (a, b, u) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], u)) : lerp(a, b, u);
// keys: [[t0, v0], [t1, v1, ease], ...]; numbers or arrays
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1, e] = keys[i + 1];
    if (t < t1) return mix(v0, v1, EASE[e || 'io']((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; }; }

// ---- paths ----
function splineInto(path, pts, closed, k = 1 / 6) {
  const n = pts.length;
  const get = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  path.moveTo(pts[0][0], pts[0][1]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
const S = (pts, closed = true) => splineInto(new Path2D(), pts, closed);
// right half listed top to bottom; mirrored around x = 0 to close the shape
function sym(right) {
  const left = right.slice().reverse().filter((p) => Math.abs(p[0]) > 1e-3).map((p) => [-p[0], p[1], p[2]]);
  return right.concat(left);
}
function poly(pts, closed = true) {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  if (closed) p.closePath();
  return p;
}
function ink(g, path, fill, lw = LINE, col = INK) {
  if (fill) { g.fillStyle = fill; g.fill(path); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path); }
}
function line(g, pts, col = INK, lw = LINE, dash = null, smooth = false) {
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = col; g.lineWidth = lw;
  if (dash) g.setLineDash(dash);
  g.stroke(smooth ? S(pts, false) : poly(pts, false));
  g.restore();
}
function sampleSpline(pts, perSeg = 10, k = 1 / 6) {
  const n = pts.length, out = [];
  const get = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    for (let j = 0; j < perSeg; j++) {
      const u = j / perSeg, v = 1 - u;
      out.push([
        v * v * v * p1[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p2[0],
        v * v * v * p1[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p2[1],
      ]);
    }
  }
  out.push(pts[n - 1].slice(0, 2));
  return out;
}
// a crescent: circle r1 at the origin with a bite by a circle r2 whose centre is d away, then rotated
function crescentPath(x, y, r1, d, r2, rot = 0) {
  const ix = (d * d + r1 * r1 - r2 * r2) / (2 * d), iy = Math.sqrt(Math.max(0, r1 * r1 - ix * ix));
  const a = Math.atan2(iy, ix), b = Math.atan2(iy, ix - d);
  const p = new Path2D();
  const c = Math.cos(rot), s = Math.sin(rot);
  p.arc(x, y, r1, rot - a, rot + a, true);
  p.arc(x + c * d, y + s * d, r2, rot + b, rot - b, false);
  p.closePath();
  return p;
}
// a filled stroke whose width follows wf(s), s in 0..1, with round ends
function taperPath(pts, wf, perSeg = 10, path = new Path2D()) {
  const q = sampleSpline(pts, perSeg);
  const n = q.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = wf(i / (n - 1)) / 2;
    L.push([q[i][0] - dy * w, q[i][1] + dx * w]);
    R.push([q[i][0] + dy * w, q[i][1] - dx * w]);
  }
  path.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) path.lineTo(L[i][0], L[i][1]);
  const e = q[n - 1], we = wf(1) / 2, ae = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  path.arc(e[0], e[1], we, ae, ae - Math.PI, true);
  for (let i = n - 1; i >= 0; i--) path.lineTo(R[i][0], R[i][1]);
  const s = q[0], ws = wf(0) / 2, as = Math.atan2(R[0][1] - s[1], R[0][0] - s[0]);
  path.arc(s[0], s[1], ws, as, as - Math.PI, true);
  path.closePath();
  return path;
}
function taper(g, pts, w0, w1, fill = INK, lw = 0, wfn = null) {
  const p = taperPath(pts, wfn || ((s) => lerp(w0, w1, s)));
  ink(g, p, fill, lw);
  return p;
}
function circle(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; }
function ellipse(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; }
function star(x, y, R, r = R * 0.42, n = 8, rot = 0) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R;
    const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q;
    if (i) p.lineTo(px, py); else p.moveTo(px, py);
  }
  p.closePath();
  return p;
}
function diamond(x, y, rx, ry = rx, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return poly([[x + s * ry, y - c * ry], [x + c * rx, y + s * rx], [x - s * ry, y + c * ry], [x - c * rx, y - s * rx]]);
}
// an eight-point sun: dark rim, gold body, a dot in the middle
function sun(g, x, y, R, body = C.gold, core = C.saffron, lw = 0) {
  ink(g, star(x, y, R, R * 0.5), body, lw);
  ink(g, circle(x, y, R * 0.3), core, lw ? lw * 0.7 : 0);
}
function dots(g, pts, r, fill, lw = 0) { for (const q of pts) ink(g, circle(q[0], q[1], r), fill, lw); }
// flat glow without gradients: stacked translucent discs
function glowDisc(g, x, y, rs, col, a) {
  g.save(); g.fillStyle = col; g.globalAlpha = a;
  for (const r of rs) g.fill(circle(x, y, r));
  g.restore();
}

// ---- woven grain: a fine linen weave in screen space, like printed cloth ----
function makeGrain() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const im = g.createImageData(W, H), d = im.data, R = rng(77);
  const P = 5.6;
  // low-frequency unevenness, so the weave does not look machine-perfect
  const lw = 48, lh = 27, low = new Float32Array(lw * lh);
  for (let i = 0; i < low.length; i++) low[i] = R();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / W * (lw - 1), fy = y / H * (lh - 1), ix = fx | 0, iy = fy | 0, ux = fx - ix, uy = fy - iy;
      const a = low[iy * lw + ix], b = low[iy * lw + ix + 1], e = low[(iy + 1) * lw + ix], f = low[(iy + 1) * lw + ix + 1];
      const m = 0.7 + 0.6 * lerp(lerp(a, b, ux), lerp(e, f, ux), uy);
      const row = Math.floor(y / P), col = Math.floor(x / P);
      const over = (row + col) % 2 === 0;
      const v = over ? Math.sin((x / P) * Math.PI * 2) : Math.sin((y / P) * Math.PI * 2);
      const n = (R() - 0.5) * 2;
      const k = 128 + (v * 9 * m + n * 6);
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = k; d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}
let GRAIN = null;
function applyGrain(g) {
  if (!GRAIN) GRAIN = makeGrain();
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(GRAIN, 0, 0);
  g.restore();
}
function plate(fn) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  fn(c.getContext('2d'));
  return c;
}
