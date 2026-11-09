// labels.js: language, the one font, parchment tags and plaques. All on-screen text goes through T_ and these.
'use strict';
// T_({ ru: '29,5 дня', en: '29.5 days' }). Numbers too: decimal commas and thousands separators differ by language.
const T_ = (o) => (typeof o === 'string' ? o : (o[LANG] != null ? o[LANG] : o.en));
// A font this machine has, with the scripts you need. For a portable project put a licensed .woff2 in web/fonts,
// declare it with @font-face in index.html and name it here; main.js waits for it before the first frame.
const FONT = 'Georgia, "Times New Roman", serif';
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const io = EASE.io;

// a parchment label with notched ends, on a thin stem from its anchor
function tag(g, x, y, text, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0.003) return;
  const size = o.size || 30;
  const dx = o.dx == null ? 0 : o.dx, dy = o.dy == null ? -70 : o.dy;
  const cx = x + dx, cy = y + dy;
  g.save();
  g.globalAlpha = a;
  const k = 0.82 + 0.18 * EASE.b(a);
  g.font = `700 ${size}px ${FONT}`;
  const w = g.measureText(text).width, hw = w / 2 + size * .62, hh = size * .78, n = size * .34;
  if (!o.stemless) { line(g, [[x, y], [cx, cy + (dy < 0 ? hh : -hh) * .9]], C.parch3, 3); g.fillStyle = C.parch3; g.fill(circle(x, y, 4)); }
  g.translate(cx, cy); g.scale(k, k); g.rotate(rad(o.rot || 0));
  ink(g, poly([[-hw - n, -hh], [hw + n, -hh], [hw, 0], [hw + n, hh], [-hw - n, hh], [-hw, 0]]), o.fill || C.parch, 2.6);
  g.fillStyle = o.color || INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, size * .05);
  g.restore();
}
// the larger plaque for titles and dates: a strip with a star at each end
function plaque(g, text, x, y, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= 0.003) return;
  const size = o.size || 42;
  g.save();
  g.globalAlpha = a;
  g.font = `700 ${size}px ${FONT}`;
  const w = g.measureText(text).width, hw = w / 2 + size * 1.2, hh = size * .86;
  g.translate(x, y);
  ink(g, poly([[-hw - 26, -hh + 8], [-hw, -hh], [hw, -hh], [hw + 26, -hh + 8], [hw + 10, 0], [hw + 26, hh - 8], [hw, hh], [-hw, hh], [-hw - 26, hh - 8], [-hw - 10, 0]]), C.parch, 3);
  line(g, [[-hw + 8, -hh + 9], [hw - 8, -hh + 9]], C.khaki, 2.6, [10, 8]);
  line(g, [[-hw + 8, hh - 9], [hw - 8, hh - 9]], C.khaki, 2.6, [10, 8]);
  for (const m of [-1, 1]) ink(g, star(m * (hw - size * .42), 0, size * .36, size * .14), C.brick2, 0);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, size * .05);
  g.restore();
}
