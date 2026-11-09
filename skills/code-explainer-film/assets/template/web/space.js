// space.js: the 3D inserts. A shared kit (toon planets with ink outlines, brass, fat chalk lines, stars) and one builder per shot.
// Every frame goes through the composer and is then drawn into the 2D canvas, so labels and grain cover 2D and 3D alike.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const COL = (c) => new THREE.Color(c);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
composer.addPass(renderPass);
// clamp before bloom: one HDR spike on a tiny glint would otherwise bloom into a bright square
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);gl_FragColor=vec4(min(c.rgb,vec3(5.)),1.);}',
}));
// threshold above 1: only true HDR blooms; a lower one washes every lit surface
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.5, 1.25);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const ENV = (() => { const p = new THREE.PMREMGenerator(renderer); const t = p.fromScene(new RoomEnvironment(), 0.03).texture; p.dispose(); return t; })();

// ---------- materials ----------
const GRAD = (() => { const d = new Uint8Array([70, 135, 200, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const brass = (c = '#c9963a', r = 0.4) => new THREE.MeshStandardMaterial({ color: COL(c), metalness: 1, roughness: r });
const enamel = (c, r = 0.35) => new THREE.MeshStandardMaterial({ color: COL(c), metalness: 0.05, roughness: r });
const INKM = new THREE.MeshBasicMaterial({ color: COL('#17100c'), side: THREE.BackSide });
const SPHERE = new THREE.SphereGeometry(1, 200, 140);   // fewer segments show as facets under toon shading

// ---------- canvas textures: paint with the same Canvas 2D kit as the flat shots ----------
function ctex(w, h, fn, opt = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h, c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = opt.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return t;
}
const TEX = {
  earth: () => ctex(2048, 1024, (g, w, h) => {
    g.fillStyle = '#1c5a78'; g.fillRect(0, 0, w, h);
    const R = rng(21);
    for (let i = 0; i < 9; i++) {
      const cx = R() * w, cy = h * (.2 + R() * .6);
      g.fillStyle = i % 3 ? '#4f8a4e' : '#8c8a55';
      for (let k = 0; k < 14; k++) { const p = new Path2D(); p.ellipse(cx + (R() - .5) * 240, cy + (R() - .5) * 170, 30 + R() * 70, 20 + R() * 50, R() * 3, 0, TAU); g.fill(p); }
    }
    g.fillStyle = '#e9e2d6'; g.fillRect(0, 0, w, 46); g.fillRect(0, h - 40, w, 40);
  }, { wrap: true }),
  moon: () => ctex(1024, 512, (g, w, h) => {
    g.fillStyle = '#bdb6a6'; g.fillRect(0, 0, w, h);
    const R = rng(14);
    for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(92,86,78,.55)'; const p = new Path2D(); p.ellipse(R() * w, h * (.2 + R() * .6), 30 + R() * 70, 20 + R() * 40, R() * 3, 0, TAU); g.fill(p); }
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h, r = 2 + R() * 9; g.strokeStyle = 'rgba(70,64,56,.5)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  }, { wrap: true }),
};

// a planet: toon-shaded painted sphere with an ink outline (a slightly bigger black back-face hull)
function planet(kind, R, opt = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(SPHERE, new THREE.MeshToonMaterial({ map: TEX[kind](), gradientMap: GRAD }));
  m.scale.setScalar(R);
  const hull = new THREE.Mesh(SPHERE, INKM);
  hull.scale.setScalar(R * (1 + (opt.outline == null ? 0.022 : opt.outline)));
  g.add(hull, m);
  g.userData.body = m;
  return g;
}

// ---------- lines and stars ----------
function fat(points, o = {}) {
  const f = []; for (const p of points) f.push(p.x, p.y, p.z);
  const geo = new LineGeometry(); geo.setPositions(f);
  const col = COL(o.color || '#7d9a93'); if (o.boost) col.multiplyScalar(o.boost);
  const mat = new LineMaterial({ color: col, linewidth: o.width || 2.4, dashed: !!o.dash, dashSize: o.dash || 1, gapSize: o.gap || o.dash || 1, transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity == null ? 1 : o.opacity, worldUnits: false, depthTest: o.depthTest !== false, depthWrite: o.depthWrite !== false });
  mat.resolution.set(W, H);
  mat.toneMapped = false;
  const l = new Line2(geo, mat);
  if (o.dash) l.computeLineDistances();
  l.frustumCulled = false;
  return l;
}
const circlePts = (r, y = 0, n = 180, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return V3(r * Math.cos(a), y, -r * Math.sin(a)); });
const STAR8 = ctex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = '#fff'; g.fill(star(w / 2, w / 2, w / 2 - 1, w * .11)); });
const DOT = ctex(32, 32, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, TAU); g.fill(); });
function points(list, size, map, color, o = {}) {
  const pos = new Float32Array(list.length * 3); list.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, map, color: COL(color), transparent: true, alphaTest: o.alphaTest == null ? 0.2 : o.alphaTest, sizeAttenuation: !!o.atten, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: o.opacity == null ? 1 : o.opacity });
  const P = new THREE.Points(g, m); P.frustumCulled = false; return P;
}
function starfield(scene, r = 300, seed = 7, nFaint = 1800, nBright = 90) {
  const R = rng(seed), f = [], b = [];
  const dir = () => { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); return V3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(r); };
  for (let i = 0; i < nFaint; i++) f.push(dir());
  for (let i = 0; i < nBright; i++) b.push(dir());
  scene.add(points(f, 2.4, DOT, '#8fb0a8', { alphaTest: .3 }));
  scene.add(points(b, 13, STAR8, '#e9e2d6', { alphaTest: .3 }));
}
function world(bg = '#0e2329', envI = 0.6) {
  const s = new THREE.Scene();
  s.background = COL(bg);
  s.environment = ENV; s.environmentIntensity = envI;
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.7); sun.position.set(5, 4, 6); s.add(sun);
  const fill = new THREE.HemisphereLight(0xbfdcd8, 0x2a1c15, 0.7); s.add(fill);
  s.userData.sun = sun; s.userData.fill = fill;
  return s;
}
const cam = (fov = 40) => new THREE.PerspectiveCamera(fov, W / H, 0.05, 2000);
// where a 3D point lands on screen, so labels can be drawn in 2D with the film's own lettering
function project(camera, v) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, front: p.z < 1 };
}
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };

// ---------- builders: each returns { scene, camera, update(t, X), overlay(g, t, X) } ----------
function buildOrbit() {
  const s = world('#0e2329', .15);
  s.userData.sun.position.set(12, 1.5, 0); s.userData.sun.intensity = 2.8;   // sunlight comes from +x, so half of each globe is lit
  s.userData.fill.intensity = .1;
  const c = cam(34);
  starfield(s, 300, 11);
  const earth = planet('earth', 1.15), moon = planet('moon', .42);
  s.add(earth, moon);
  const R = 5.2;
  s.add(fat(circlePts(R), { color: '#7d9a93', width: 2.6, dash: .2, gap: .16 }));
  return {
    scene: s, camera: c,
    update(t, X) {
      const u = t - X.b.start;
      const a = rad(150) + TAU * .85 * ease(ramp(t, CUE.orbit - .4, X.b.end + .4));
      moon.position.set(R * Math.cos(a), 0, -R * Math.sin(a));
      moon.rotation.y = a + Math.PI;      // the same face stays towards the Earth
      earth.rotation.y = u * .25;
      const az = rad(-20) + u * .04, rr = 15.5;   // the camera stays well outside the orbit, so nothing flies through the lens
      const hh = lerp(7, 4.5, ease(ramp(t, CUE.side - .6, CUE.side + 2)));
      c.position.set(Math.sin(az) * rr, hh, Math.cos(az) * rr); c.lookAt(0, 0, 0);
    },
    overlay(g, t, X) {
      const mp = project(c, moon.position), ep = project(c, V3());
      const look = ease(ramp(t, CUE.side - .2, CUE.side + .4));
      if (look > 0) { g.save(); g.globalAlpha = look; line(g, [[ep.x, ep.y], [mp.x, mp.y]], C.gold2, 3.4, [12, 10]); g.restore(); }
      const b = ease(ramp(t, X.b.start + .1, X.b.start + .6));
      tag(g, ep.x, ep.y - 125, T_({ ru: 'Земля', en: 'Earth' }), { a: b, dy: -50 });
      tag(g, mp.x, mp.y - 46, T_({ ru: 'Луна', en: 'Moon' }), { a: b, dy: -56 });
      tag(g, W - 300, 130, T_({ ru: '← свет Солнца', en: '← sunlight' }), { a: b, stemless: true, dy: 0 });
    },
  };
}

// ---------- registry ----------
const BUILD = { orbit: buildOrbit };
const CACHE = {};
function shot(name) { if (!CACHE[name]) CACHE[name] = BUILD[name](); return CACHE[name]; }

export const SPACE = {
  // draws one 3D frame into the 2D context g
  draw(g, name, t, X) {
    const S = shot(name);
    S.update(t, X);
    renderPass.scene = S.scene; renderPass.camera = S.camera;
    bloom.strength = X.bloom == null ? 0.22 : X.bloom;
    composer.render();
    g.drawImage(renderer.domElement, 0, 0);
    if (S.overlay) S.overlay(g, t, X);
  },
};
