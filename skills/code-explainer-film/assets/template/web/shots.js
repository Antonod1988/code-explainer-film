// shots.js: the flat shots of the demo film. Replace them with your own.
// A shot is a pure function of (g, t): no clocks, no unseeded random, so any frame can be rendered alone and comes out the same.
'use strict';

// static layers are drawn once into a plate, which keeps a frame cheap
let SKY = null;
const sky = () => SKY || (SKY = plate((g) => {
  g.fillStyle = C.night; g.fillRect(0, 0, W, H);
  const R = rng(1054);
  for (let i = 0; i < 300; i++) { g.globalAlpha = .25 + R() * .5; g.fillStyle = C.parch3; g.fill(circle(R() * W, R() * H, .8 + R() * 1.8)); }
  g.globalAlpha = 1;
  for (let i = 0; i < 16; i++) ink(g, star(R() * W, R() * H, 9 + R() * 11, 3.4), C.gold2, 0);
  g.strokeStyle = C.chalk2; g.lineWidth = 2.4; g.setLineDash([10, 12]);
  for (const r of [320, 450, 590, 740]) g.stroke(circle(W / 2, H / 2 + 30, r));
  g.setLineDash([]);
}));

// a flat Moon at phase p: 0 new, .25 first quarter, .5 full, .75 last quarter
function flatMoon(g, x, y, r, p) {
  ink(g, circle(x, y, r), C.night3, LINE);
  const q = ((p % 1) + 1) % 1, wax = q <= .5, k = Math.cos(q * Math.PI * 2);
  const lit = new Path2D();
  lit.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !wax);                                     // the lit limb
  lit.ellipse(x, y, Math.max(.01, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, wax ? k > 0 : k < 0);   // back along the terminator
  lit.closePath();
  g.fillStyle = C.parch3; g.fill(lit);
  g.save(); g.clip(lit);
  const R = rng(3); g.fillStyle = C.parch2;
  for (let i = 0; i < 8; i++) g.fill(ellipse(x + (R() - .5) * r * 1.5, y + (R() - .5) * r * 1.5, r * (.1 + R() * .16), r * (.08 + R() * .1), R() * 3));
  g.restore();
  g.lineWidth = LINE; g.strokeStyle = INK; g.stroke(circle(x, y, r));
}

function shotTitle(g, t) {
  g.drawImage(sky(), 0, 0);
  // the Moon acts on 12 frames a second, like a drawn character; the slow push-in stays on every frame
  const tc = step(t, 12);
  const p = track([[0, .12], [CUE.turn, .12], [CUE.turn + 3.2, .44, 'io']], tc);
  const bob = Math.sin(tc * 1.6) * 6;
  const zoom = lerp(1, 1.06, ramp(t, 0, BEAT.b02.start));
  g.save();
  g.translate(W / 2, H / 2 + 50); g.scale(zoom, zoom);
  glowDisc(g, 0, bob, [320, 370, 430], C.parch3, .05);
  flatMoon(g, 0, bob, 270, p);
  g.restore();
  plaque(g, T_({ ru: 'Почему у Луны есть фазы', en: 'Why the Moon has phases' }), W / 2, 110, { a: io(ramp(t, .5, 1.1)), size: 46 });
  tag(g, W / 2 + 205, H / 2 - 140 + bob, T_({ ru: 'видимая часть', en: 'the part we see' }), { a: io(ramp(t, CUE.turn, CUE.turn + .5)), dx: 260, dy: -60 });
}

function shotPhases(g, t) {
  g.drawImage(sky(), 0, 0);
  const n = 8, x0 = 240, dx = (W - 480) / (n - 1), y = H / 2 + 20, r = 92;
  const t0 = BEAT.b03.start + .2, each = (CUE.end - t0) / n;
  for (let i = 0; i < n; i++) {
    const a = ramp(t, t0 + i * each, t0 + i * each + .35);
    if (a <= 0) continue;
    const s = EASE.b(a);
    g.save(); g.translate(x0 + i * dx, y); g.scale(s, s); flatMoon(g, 0, 0, r, i / n); g.restore();
  }
  // a star runs along the row, and goes home on "starts over"
  const run = ramp(t, CUE.cycle, CUE.end - .05), back = io(ramp(t, CUE.end, CUE.end + .7));
  const px = lerp(lerp(x0, x0 + (n - 1) * dx, run), x0, back);
  ink(g, star(px, y + r + 62, 26, 9), C.gold, LINE * .7);
  plaque(g, T_({ ru: '29,5 дня', en: '29.5 days' }), W / 2, 170, { a: io(ramp(t, BEAT.b03.start, BEAT.b03.start + .5)) });
}
