# Picture

Contents: the timeline, flat shots, acting on cues, on-screen text, grain, transitions, 3D inserts, speed, a map of the example code.

## The timeline

`web/film.js` holds:

- `CUE` and `BEAT` from `TIMING[LANG]`.
- `SHOT`: name to `(g, t) => draw`.
- `SEQ`: the order of shots. Each entry has `at`, a function returning a time from cues or beats, and `tr`, how it arrives: `cut`, `wipe` or `fade`.
- `FILM.frame(g, t)`: picks the shot, handles transitions, applies grain, fades in and out.

Helpers in `lib.js` and `labels.js`:

- `ramp(t, a, b)` gives 0..1 between two times, clamped.
- `EASE.io`, `.o`, `.i`, `.b` (overshoot), `.l`, `.h` (hold).
- `track([[t0, v0], [t1, v1, 'io'], ...], t)` is a keyframe track over numbers or arrays.
- `step(t, 12)` quantises time for limited animation.
- `rng(seed)` is the only random you should use.

A shot usually reads as a list of `ramp`s on cues:

```js
const a = io(ramp(t, CUE.turn, CUE.turn + .5));
tag(g, x, y, T_({ ru: 'видимая часть', en: 'the part we see' }), { a });
```

Give each 3D shot `X.b`, its beat, so its motion can span `b.start` to `b.end`.

## The frame

`W`, `H` and `FPS` come from `"format"` in `script.json` through the timeline. Lay everything out from them, never from 1920 and 1080. A vertical film (`9:16`) needs its own compositions: stack what a wide frame puts side by side, keep text in the middle two thirds (platform buttons cover the bottom and the right edge), and give a 3D camera more distance or a wider field of view, since the narrow frame cuts the sides of a scene. Look at stills in the real format before writing many shots.

## Flat shots

The look comes from a few primitives in `lib.js`:

- `S(pts, closed)`: a smooth spline through points, returned as a `Path2D`.
- `sym(rightHalf)`: mirror a half outline, for faces and vases.
- `taperPath(pts, widthFn)`: a filled stroke whose width varies. This is what makes lines look drawn.
- `ink(g, path, fill, lineWidth)`: fill and an ink outline.
- `line(g, pts, color, width, dash, smooth)`, `poly`, `circle`, `ellipse`, `star`, `diamond`, `crescentPath`.
- `glowDisc(g, x, y, radii, color, alpha)`: stacked translucent discs, a flat glow without gradients.
- `plate(fn)`: draw once into an offscreen canvas. Use it for everything static.

Design coordinates are 1920x1080 and never change. Shapes are written as numbers in code. It takes more lines than you expect, so give each element its own function (`drawOwl`, `drawLantern`), as `scene1.js` does. Then you can reuse it and fix it alone.

Choose the palette from the style sheet and keep it in the `C` object. Pick a near-black for ink, not pure black.

### Limited animation

A character on 12 fps with held poses reads as drawn. Everything moving smoothly reads as cheap software. Inside one shot:

```js
const tc = step(t, 12);       // the character acts on this
const zoom = lerp(1, 1.06, ramp(t, 0, end));   // the camera stays on t
```

Use `EASE.b` for a little overshoot on arrival, blink with short holds, and let the background sit still.

### Acting on cues

A performance has its own rhythm, but its key poses must land on words, in every language. Author the acting on a fixed clock, then warp time so the poses fall on the cues. From the real film:

```js
const F = CUE.flare, P = CUE.plant, Rch = P - 3.62;
const pl = (pts) => (x) => { /* piecewise linear through pts */ };
WARP.arm  = pl([[0, 0], [1.8, 1.8], [Rch, 3.1], [P, 6.72]]);
WARP.head = pl([[0, 0], [1.8, 1.8], [F, 3.1], [F + .7, 3.8], [Rch + .7, 3.81], [P, 6.72]]);
```

The arm's authored clock reaches 6.72, the plant, exactly on the word `поставили`, whatever the language's timing. The head has its own warp, so she looks up on the flare. See `init` in `examples/court-astronomer/film.js` and `scene1` in `scene1.js`.

### A hand rig

`examples/court-astronomer/hand.js` is forward kinematics for a hand: named poses (chin, tap, reach, pinch, twist, flat, plant, open, grip) with finger lengths, blended over time. Reuse it if your character holds things. Hands are the part most likely to look wrong, so look at them first on every sheet.

## On-screen text

- Everything goes through `T_({ ru, en })`, numbers included. Decimal separators and thousands separators differ.
- One font. `FONT` in `labels.js` is a stack the machine has. System fonts differ between machines: for a portable project bundle a licensed font in `web/fonts`, declare it in `index.html`, and check it covers your scripts (Cyrillic especially). `main.js` waits for the font before drawing.
- `tag(g, x, y, text, { a, dx, dy, stemless, size })`: a parchment label on a stem from an anchor. `plaque(g, text, x, y, { a, size })`: a title strip.
- Keep labels away from the frame's edges. Mobile players crop and overlay near them.
- Text in a language can be 30% longer. Check the longest label in each language on a sheet.

## Grain

`applyGrain(g)` overlays a full-frame woven texture with the `overlay` composite, in screen space, as the last step of every frame. It is what welds 2D and 3D together. It does not move with the art, so it reads as the surface of the film. Period 5.6 px, built once from a seeded generator.

Grain costs bitrate. Masters at CRF 16 to 17 hold it. Small copies run `hqdn3d` first, or the encoder spends everything on it. If your loop point pulses because of a keyframe, set `GOP` to the clip length.

## Transitions

`SEQ` supports three. A cut. A `wipe`, the parchment band in `wipeGeom`/`paintWipe`, showing the old shot until the band passes (1.5 s; start it about .15 to .3 s before the new beat). A `fade`, .55 s, drawn through an offscreen `TMP` canvas. For a wipe, add a paper sound `.75` s before its centre.

Design a transition of your own to match your film's material: the band is that film's signature.

## 3D inserts

### Architecture

`web/space.js`: a kit, then builders. A builder returns `{ scene, camera, update(t, X), overlay(g, t, X) }`, is built once on first use and is cached. `SPACE.draw(g, name, t, X)` updates it, renders through the composer, draws the result into the 2D canvas with `g.drawImage(renderer.domElement, 0, 0)`, then calls `overlay` for labels.

The renderer needs `preserveDrawingBuffer: true`, or `drawImage` reads an empty buffer. Use a local copy of three.js through an import map: `new_project.py` provides revision 186 in `web/vendor`.

### Render chain, and why

HalfFloat target with 4 samples, RenderPass, a clamp pass, `UnrealBloomPass(strength .22, radius .5, threshold 1.25)`, OutputPass, and `NoToneMapping`.

- **Clamp before bloom.** One HDR spike on a tiny glint blooms into a bright square.
- **Threshold above 1.** Only true HDR blooms. A lower one washes every lit surface and tints dark scenes.
- `bloom` is set per shot through `X.bloom`. The real film used .22 as a base, .3 for the conjunction, .42 for the eclipse, .6 for the nebula.
- To make one thing glow, push its colour over 1: `fat(pts, { boost: 2.2 })`.

### Materials

- **Painted surfaces (dials, charts, globes with lettering): `MeshBasicMaterial` with a canvas texture.** Lit materials wash them out and put a hot spot across the lettering.
- **Metal:** `MeshStandardMaterial`, `metalness: 1`, roughness .34 to .5, reflecting a RoomEnvironment PMREM. Keep light moderate, or brass blows out.
- **Planets and objects in the flat style:** `MeshToonMaterial` with a 4-step nearest-filter `gradientMap`, plus a black back-face hull 2.2% larger for the ink outline. See `planet()`.
- **Spheres under toon shading need many segments** (200x140). Few segments show as facets at the terminator.
- Paint textures with the same Canvas kit as the flat shots, through `ctex`.

### Lines and points

- `fat(points, opts)` wraps Line2: real width in pixels, dashes. `resolution` must be set, `toneMapped = false`, `computeLineDistances()` for dashes, `frustumCulled = false`.
- `points(list, size, map, color, opts)`, `starfield(scene, r, seed, nFaint, nBright)`.
- Big clouds use a small `ShaderMaterial` with additive blending. The Crab Nebula in `buildCrab` is 3,200 filaments of 46 points walked through a noise field plus 70,000 mist points, about 217,000 in all, with a seeded generator.

### Labels and lettering

- Labels live in `overlay`, in 2D, at `project(camera, position)`.
- Lettering painted on a round dial must flip on the near half, or the near side reads upside-down. See `dialRot(a, nearLon)` in the example.

### Cameras

- Put the camera outside anything that moves. In the real film, orrery arms flew through the lens until the camera radius went to 10.6 or more.
- Prefer a slow drift (about .04 rad/s) plus a slow push-in. Motion that big is what makes a static model feel alive.
- A far pull-away in space is an empty black frame. Cut to a different subject instead of pulling back further.
- Check each object is really in frame. In the first eclipse shot the Moon's path never entered it, and only a sheet showed that.

### Colour traps in dark scenes

- If you paint in gamma space, apply `pow(2.2)`, and then OutputPass applies sRGB, everything under about .05 crushes to black. Keep a night sky at .08 or more on its ramp.
- A wide bloom off large lit areas adds a warm lift that turns a teal night olive. Threshold 1 or more.
- When matching a reference, compare mean RGB per luminance band instead of judging by eye.

### Overlapping surfaces

Two surfaces in one plane flicker in streaks (z-fighting), which often look like radial lines on a plate. Separate them by a visible distance: in the real film, plate at y = .012 and gears at y = .04.

## Speed

The real film took 109 to 135 ms a frame at 1080p, about 7,600 frames per language. Static backgrounds in plates, cached builders, and one grain texture keep it there. If a shot goes over about 300 ms a frame, look for geometry rebuilt inside `update` and for canvases repainted each frame.

## Map of the example code

`assets/examples/court-astronomer/` is the real film. It does not run on its own (it needs `data.js`, a planet table not included here, and the film's timing files). Read it for technique.

| File | What to find there |
|---|---|
| `space.js` | Kit at the top. Builders: `buildAxis` line 248 (globe, pole path), `buildZodiac` 391 (band with lettering), `buildOrrery` 479 (brass clockwork), `buildConj` 586 (two planets through an eyepiece), `buildSigns` 627, `buildWheel` 698 (five hands, figures between planets), `buildLanes` 813, `buildEclipse` 888 (globe with a moving shadow), `buildHelix` 966 (spiral staircase of years), `buildCrab` 1056 (particle nebula) |
| `film.js` | `SHOT`, `SEQ`, the wipe, `WARP` anchors in `init` |
| `scene1.js` | A full character and room: `drawWall`, `drawDisc`, `drawLantern`, `drawArmillary`, `drawOwl`, `drawFigure`, `drawFace`, `drawArm`, `poseR`, `blinkAt`, `scene1` |
| `scene2.js` | Broad-nib lettering written stroke by stroke (`GLYPHS`, `buildLetter`, `drawLettering`), a deed |
| `flat.js` | `tag`, `plaque`, `eyepiece`, `driftChart`, banners, `shotAges`, `shotPins`, `shotBook`, `shotStarChart`, `shotDeed2` |
| `hand.js` | The hand rig |
| `map.js` | Hand-simplified coastlines as rings, and `paintEarth` |
| `score.py` | A full 5-minute score and effects list, in the older single-file form of `audio/score.py` + `mixlib.py` |
