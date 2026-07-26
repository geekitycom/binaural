# Plan: Convert Binaural to Vite + React and adopt the `mock-2` "Session Studio" UI

This plan converts the current single-file vanilla-JS app (`index.html`) into a
Vite + React project **and** rebuilds the interface to match the
`prototypes/mock-2.html` "Session Studio" mockup — a DAW-style mixer + timeline
layout — while preserving the fully-working Web Audio engine that already exists.

The mockup is **UI-only** (it has fake curves, a decorative meter, and no real
audio). The core engineering work is: (1) faithfully port the real audio engine,
(2) rebuild the mock's UI as React components, and (3) wire the mock's
interactions to the real engine — including two genuinely *new* features the mock
introduces (per-layer volume + mute/solo).

---

## 1. Goals & non-goals

**Goals**
- Migrate to a Vite + React (JSX) toolchain with a component architecture.
- Match `mock-2.html` visually and interactively: transport bar, live readouts +
  band pill, left column of mixer "Layers" + "Saved sessions", main column with
  the SVG timeline hero + Beat-drift / Carrier-drift cards (dual-handle sliders,
  click-to-edit numbers, collapsible panels, snap grid, animated L/R meter).
- Preserve every current audio capability and its correctness guarantees
  (click-free scheduling, two-`ConstantSourceNode` design, isochronic gate that
  tracks drift, audio-clock-scheduled session end that survives a backgrounded
  tab, pause via `suspend()`).
- Preserve sessions: `localStorage` save/load/delete, JSON export/import.
- **Build on reusable, composable components** (shared primitives + generic
  layer/panel components), not per-feature copy-paste.
- **Make everything themeable** via design tokens. Ship **light + dark** themes at
  minimum, with the architecture ready for additional themes later.

**Non-goals (this pass)**
- No new audio DSP beyond what the mock implies (per-layer vol, mute/solo).
- No backend, accounts, or persistence beyond `localStorage`.
- Arbitrary multi-point automation editing on the timeline (the mock's interior
  control-point dots are decorative — see §6 decision).

---

## 2. Key decisions (flagged — override if you disagree)

These change scope; each has a **recommended default** so work can proceed.

1. **Build step replaces `file://` "just double-click" delivery.**
   Vite outputs hashed ES modules that don't run from `file://`. This breaks the
   README's headline promise ("no build step, open the file").
   **Recommendation:** accept `npm run dev` / `npm run build` for development, and
   add [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile)
   to also emit **one self-contained `dist/index.html`** (all JS/CSS inlined) so
   the "open one file, no server" property is retained for end users. Best of both.

2. **Volume model changes to per-layer (the mock has no master volume).**
   Current model: one master volume that also scales noise; noise/iso have their
   own relative gains; the binaural tone has no independent gain.
   Mock model: **each layer (Binaural / Isochronic / Noise) has its own Vol**, and
   there is no global master slider.
   **Recommendation:** adopt per-layer volumes. Add a dedicated binaural layer
   gain. Keep an internal master node pinned at unity (headroom/limiting only).
   Config gains a `tone.vol`; top-level `volume` is migrated into it (see §4).

3. **Mute / Solo are new mixer features.** Not in the current engine.
   **Recommendation:** implement them for real (per-layer solo/mute gain factor).
   Treat them as **ephemeral session state, not persisted** in saved configs.

4. **Timeline curve is rendered from the real drift model, not catmull-rom
   control points.** The mock draws a fake smoothed curve through hand-authored
   points and lets you drag interior dots. Our curve must equal what the audio
   actually plays.
   **Recommendation:** render the timeline curve by sampling the engine's real
   `interp()` (linear / ease-smoothstep / stepped-with-smoothing), exactly as the
   current `drawGraph()` already does. Keep the mock's look (band zones, area
   fill, dashed carrier line, playhead, axis, legend). Make **only the two
   endpoints** draggable handles, two-way bound to the Beat-drift dual slider.
   Interior control-point dragging (arbitrary automation) is out of scope.

5. **Layer enable/disable.** The mock lets even the Binaural layer be powered OFF.
   **Recommendation:** allow it (`tone.on`, default true). If all layers are off,
   nothing plays — that's fine.

6. **State management:** plain React (`useReducer` + context) — no Redux/zustand.
   High-frequency visuals bypass React (imperative refs) — see §5.

---

## 3. Target architecture

The single 1,055-line `index.html` splits into a **framework-agnostic audio
engine** (imperative, owns the `AudioContext` and node graph, is the timing
authority) and a **React UI** (declarative, owns config state, calls engine
methods on user events, and reads engine-published live values for visuals).

Critical principle preserved from today: **React must never write AudioParams on
every render.** User events call engine methods; the engine schedules via
`setTargetAtTime` / `setValueCurveAtTime`; the render loop only *reads* live
values out of the engine to paint visuals.

### Proposed file tree

```
binaural/
  index.html                 # Vite entry: <div id="root"> + module script
  package.json
  vite.config.js             # React plugin (+ singlefile plugin for dist)
  src/
    main.jsx
    App.jsx                  # layout shell, provides config context + engine
    audio/
      AudioEngine.js         # THE engine — ported verbatim from index.html logic
      noise.js               # makeNoiseBuffer(type) (white/pink/brown)
      curves.js              # interp(), sampleCurve(), beatAt(), carrierAt()
    lib/
      bands.js               # BANDS[], band(hz)
      config.js              # DEFAULT_CONFIG, migrate(v1->v2), validate/clamp
      storage.js             # localStorage saved-sessions CRUD, export/import
    state/
      configReducer.js       # config actions/reducer
      ConfigContext.jsx      # provider + useConfig() / useDispatch()
    theme/
      tokens.css             # semantic CSS custom props (the ONLY source of color)
      themes.css             # [data-theme="dark"] / ="light" token value sets
      ThemeContext.jsx       # provider: current theme + setTheme, persists choice
      useTheme.js
    hooks/
      useAudioEngine.js      # bridges reducer <-> engine; owns rAF/interval loop
      useEngineFrame.js      # subscribe to engine onFrame for imperative visuals
    components/
      primitives/            # shared, presentational, theme-driven building blocks
        Slider.jsx           #   one range slider (used by every layer + vol + offset)
        IconButton.jsx       #   round/square icon button (transport, session actions)
        SegControl.jsx       #   segmented button group (noise type, drift shape)
        Toggle.jsx           #   aria-pressed pill toggle (drift/snap toolbar)
        EditableNumber.jsx   #   click-to-edit numeric span (mock's _editing pattern)
        Panel.jsx            #   collapsible card (hd + caret + body)
        BandPill.jsx         #   colored band label (transport + reused wherever)
        ColorDot.jsx         #   band/layer color swatch
        ThemeToggle.jsx      #   light/dark (extensible) switch, placed in transport
      TransportBar.jsx       # brand, play/pause/stop, scrub, readouts, band pill
      LayersPanel.jsx
      Layer.jsx              # GENERIC mixer track: header (mute/solo/power) + slot
      MixSlider.jsx          # labeled vol/offset row = <Slider> + label + value
      BinauralLayerBody.jsx  # composes MixSlider ×3 (carrier/beat/vol) + Meter + hp badge
      IsoLayerBody.jsx       # composes MixSlider ×2 (vol + offset)
      NoiseLayerBody.jsx     # SegControl (type) + MixSlider (vol)
      Meter.jsx              # animated L/R waveform (SVG, imperative rAF)
      SavedSessions.jsx      # list + load/delete + import/export
      Timeline.jsx           # SVG hero: band zones, curve, carrier, playhead, handles
      TimelineToolbar.jsx    # presets + Beat/Carrier drift + Snap grid toggles
      DriftCard.jsx          # GENERIC: reused for both beat & carrier drift
      DualSlider.jsx         # two-handle range (drag + keyboard + click-to-edit)
      Toast.jsx              # transient status message
    styles/
      base.css               # reset + layout/structural CSS from mock-2 (no colors)
  prototypes/ …              # unchanged (kept for reference)
  README.md  REPORT.md       # README updated at the end (§8)
```

**Reuse over duplication.** The three mixer layers share one generic `Layer`
(header with mute/solo/power) and compose bodies from the same `MixSlider` /
`SegControl` primitives. `DriftCard` is a single component rendered twice (beat &
carrier) — not two near-identical files. Every raw control (`<input type=range>`,
icon button, segmented control, toggle, editable number) exists exactly once under
`primitives/`.

**CSS approach (theming-first).** Port `mock-2.html`'s `<style>` but split it:
- `styles/base.css` — the structural/layout rules and class names, verbatim, so
  markup stays pixel-faithful. **Contains no literal colors.**
- `theme/tokens.css` — every color the app uses, expressed as **semantic** CSS
  custom properties (e.g. `--surface`, `--surface-raised`, `--border`, `--text`,
  `--text-muted`, `--accent`, `--band-delta…--band-gamma`, `--danger`). Components
  reference only these tokens, never a hex value.
- `theme/themes.css` — token *values* per theme, under `:root[data-theme="dark"]`
  and `:root[data-theme="light"]`. mock-2's existing palette becomes the **dark**
  set; a new light set is authored to match. Adding a third theme later = one more
  block, zero component changes.

This is why base and color are separated: swapping a theme must never touch layout
or JSX — only which token block is active.

**Theme runtime.** `ThemeContext` sets `data-theme` on `<html>`. Default follows
`prefers-color-scheme`; an explicit choice via `ThemeToggle` overrides it and is
persisted to `localStorage`. Because switching only flips one attribute, it is
instant and affects the whole tree including SVG (the timeline/meter read the same
tokens via `getComputedStyle` or `currentColor`, so **canvas/SVG colors are
theme-aware too** — no hardcoded hex in the draw code). The token set is the
public contract for "more themes later."

---

## 4. Config shape (v2) & migration

Current v1 shape (from `readConfig()`):
```
{ carrier, beat, volume, duration,
  drift{on,start,end,shape,plateaus},
  carrierDrift{on,start,end,shape,plateaus},
  noise{on,type,vol}, iso{on,offset,vol}, name? }
```

Proposed **v2** (per-layer volume, layer enable, versioned):
```
{ version:2, name?, duration,
  tone:   { on:true, carrier, beat, vol },   // vol is new; on is new
  drift:  { on, start, end, shape, plateaus },
  carrierDrift: { on, start, end, shape, plateaus },
  iso:    { on, offset, vol },
  noise:  { on, type, vol } }
```

- `migrate(cfg)` in `lib/config.js`: if `version` absent → map v1
  `carrier/beat/volume` into `tone.{carrier,beat,vol}`, default `tone.on=true`,
  set `version:2`. Everything else passes through unchanged. Used on **every**
  `localStorage` read and **every** import so old saves/JSON still load.
- Mute/solo are **not** in the config (ephemeral).
- `validate/clamp` centralizes range clamps (carrier 50–500, beat 0.5–40,
  duration 1–180, vols 0–1, offset −100..100).

---

## 5. Audio engine port (the crown jewel — port, don't rewrite)

Move the existing engine logic into `audio/AudioEngine.js` as a small class,
keeping the algorithms **byte-for-byte equivalent** where possible. What must be
preserved exactly (these are the app's hard-won correctness properties):

- **Two-`ConstantSourceNode` frequency drive:** `carrierSrc` → both osc
  frequencies; `beatSrc` → right osc only (osc intrinsic freq 0). This is what
  keeps carrier and beat independently live-editable without value-curve
  collisions. Keep it.
- **Click-free changes:** fades via `toneGain` ramps; drift via
  `setValueCurveAtTime` on the relevant offset sampled by `sampleCurve()`
  (~2 pts/s, 32–20000 clamp, linear interp); live retune via `setTargetAtTime`
  (~0.02s). A drifting param's slider is inert.
- **Isochronic gate:** sine LFO driven by the *same* `beatSrc`, raised-cosine
  (`0.5+0.5·sin`) gate → pulse rate tracks drift/live edits for free; iso carrier
  = `carrierSrc + isoOffsetSrc`.
- **Audio-clock session end:** pre-schedule end fade-out and every `.stop()`;
  teardown/UI-reset in `leftOsc.onended` so a backgrounded tab still ends
  correctly. `requestAnimationFrame` is visuals-only; `setInterval(500ms)` keeps
  the timer alive in a hidden tab.
- **Pause/resume:** `ctx.suspend()` / `ctx.resume()` freezes the whole timeline.
- **Live add/remove of noise & iso mid-session** (`spawnNoise`/`startNoiseLive`/
  `stopNoiseLive`, `spawnIso`/`startIsoLive`/`stopIsoLive`), click-free.

**New engine work for the mock:**
- **Per-layer gains.** Restructure so each layer routes
  `source → envelopeGain → layerVolGain → muteSoloGain → master(=unity) → dest`.
  Binaural tone gets its own `toneVolGain` (new). Noise/iso already have vol
  gains; add a `muteSoloGain` factor to each layer.
- **Mute/Solo.** Engine method `setLayerMix({binaural,iso,noise})` computes each
  layer's effective on/off from `mute`, any `solo`, and `power`, and ramps that
  layer's `muteSoloGain` (short `setTargetAtTime`, click-free). Solo = if any
  layer soloed, only soloed layers audible.
- **Binaural power off.** Allow `tone.on=false` (skip/teardown the binaural
  layer). Guard everything that assumes the tone always exists.

**Engine public surface (imperative):**
```
new AudioEngine()
engine.start(config)              // build graph, schedule everything
engine.stop()  engine.pause()  engine.resume()
engine.setCarrier(hz) engine.setBeat(hz)          // live retune (no-op if drifting)
engine.setLayerVol('tone'|'iso'|'noise', 0..1)
engine.setIsoOffset(hz)
engine.setNoiseType(type)
engine.setLayerPower(layer, on)   // live add/remove
engine.setLayerMix({...})         // mute/solo
engine.onFrame = cb               // cb({playing,paused,elapsed,remaining,beat,carrier,band})
engine.onEnded = cb               // ({completed:boolean})
```
`onFrame` is emitted from the engine's rAF/interval loop and is the single source
of live values for the UI.

---

## 6. React state & the render loop

- **Config** lives in `useReducer(configReducer, DEFAULT_CONFIG)` behind
  `ConfigContext`. All form controls dispatch actions; components read via
  `useConfig()`. This is the source of truth for the timeline curve, drift cards,
  layers, etc.
- **`useAudioEngine`** instantiates one `AudioEngine`, exposes `play/pause/stop`,
  and translates config-change events into engine method calls (e.g. slider →
  `setBeat`; power toggle → `setLayerPower`; mute/solo → `setLayerMix`).
- **`useEngineFrame`** subscribes to `engine.onFrame`. **High-frequency visuals do
  NOT use React state:** the callback writes directly to refs/DOM/SVG —
  transport readouts (`roCarrier/roBeat/roLR`), band pill, timeline playhead dot +
  scrub fill, driven sliders' thumb/value, the pulse. Only *coarse* state
  (playing flag; timer text at ~2/s) goes through `setState`. This mirrors how the
  mock animates the SVG directly and keeps 60fps off the React reconciler.
- **Idle animation:** when not playing, a light rAF still animates the meter and
  the idle pulse from the configured beat (as the current app does).

**Timeline reconciliation (per decision §2.4):** `Timeline.jsx` samples
`curves.js`'s real `interp()` to draw the beat curve + area, the dashed carrier
curve, band zones, axis (auto-scaled via the mock's `computeAxis`), gridlines,
and playhead. The two **endpoint** handles are draggable and dispatch drift
`start`/`end` updates — kept in sync with the Beat-drift `DualSlider`. No interior
automation editing.

---

## 7. UI component mapping (mock-2 → React)

| mock-2 markup / behavior | Component | Wiring |
|---|---|---|
| `.transport` brand + play/pause/stop | `TransportBar` | buttons → `play/pause/stop`; disabled states from `playing` |
| `.scrub` time + track fill + knob | `TransportBar` | fill %/knob/time driven imperatively from `onFrame`; total from `duration` |
| `.readout` Carrier/Beat/L·R + `.bandpill` | `TransportBar` | imperative from `onFrame` (live) or config (idle) |
| `.panel` + `.hd.hd-collapsible` + caret | `Panel` | `collapsed` toggle state (local) |
| `.layer.l-binaural` mute/solo/pow + tone sliders + drivetag + `.metabox` + hp badge | `Layer` + `BinauralLayerBody` + `Meter` | vol→`setLayerVol('tone')`; carrier/beat sliders (inert + `drivetag` when their drift is on); pow→`setLayerPower`; mute/solo→`setLayerMix` |
| `.layer.l-iso` vol + offset | `IsoLayerBody` | vol→`setLayerVol('iso')`; offset→`setIsoOffset` (real −100..100 Hz, not the mock's 0–100 fake map) |
| `.layer.l-noise` type seg + vol | `NoiseLayerBody` | type→`setNoiseType`; vol→`setLayerVol('noise')`; pow→live add/remove |
| `.sess-list` + `.impexp` | `SavedSessions` | list from `storage.js`; load→`applyConfig`; delete; import/export JSON |
| `.tl-toolbar` presets + drift/snap toggles | `TimelineToolbar` | presets set base beat (inert while beat drift on); Beat/Carrier-drift toggles → drift `.on` (show/hide cards, set driven); snap = visual grid density |
| `#timeline` SVG | `Timeline` | curve from real `interp()`, playhead from `onFrame`, endpoint handles ↔ drift start/end |
| `.legend` | `Timeline` | static |
| `#beatDriftCard` / `#carrierDriftCard` dual slider + shape seg + plateaus | `DriftCard` + `DualSlider` + `SegControl` + `EditableNumber` | dual→drift start/end; shape seg→`shape`; plateaus visible only for `stepped` |
| dual-handle drag/keyboard/click-to-edit | `DualSlider` + `EditableNumber` | port the mock's `initDual`/`_editing` logic into hooks; dispatch to config |

**Features to carry over that the mock omits:** keyboard **Space** = play/pause
(add it). The "Relaxation descent" quick preset is **dropped** — not carried over.

---

## 8. Work phases (ordered, each independently verifiable)

**Phase 0 — Decisions.** Confirm §2 (esp. single-file build, per-layer volume,
mute/solo persistence, timeline interactivity). Adjust plan if needed.

**Phase 1 — Scaffold + theming foundation.** `npm init` + Vite React;
`vite.config.js` with `@vitejs/plugin-react` (+ `vite-plugin-singlefile` for
`build`); root `index.html` entry + `main.jsx`; split `mock-2` `<style>` into
`styles/base.css` + `theme/tokens.css` + `theme/themes.css` (dark = mock palette,
light authored to match); `ThemeContext`/`ThemeToggle`; render the mock's **static
markup** as JSX in `App.jsx`. `.gitignore` for `node_modules`/`dist`. *Verify:*
`npm run dev` renders mock-2 pixel-for-pixel in dark, and the theme toggle flips
the entire UI to a coherent light theme with no layout shift.

**Phase 2 — Engine port.** Create `audio/{AudioEngine,noise,curves}.js` and
`lib/bands.js` from the existing code, unchanged in behavior; a throwaway button
proves play/stop/pause and a basic binaural tone works. *Verify:* headphones —
beat audible, click-free start/stop, pause across a tab switch, session ends on a
backgrounded tab.

**Phase 3 — State & storage.** `configReducer`, `ConfigContext`, `DEFAULT_CONFIG`,
`migrate`, `validate`, `storage.js`. *Verify:* unit-migrate a v1 JSON blob to v2.

**Phase 4 — Components (static→bound).** Build all §3 components, bound to config
(no live audio yet): panels collapse, sliders/segs/toggles/editable-numbers/dual
sliders dispatch and re-render, drift cards show/hide, timeline draws the real
curve from config. *Verify:* editing drift start/end reshapes the timeline; shape
`stepped` reveals plateaus.

**Phase 5 — Engine ↔ UI wiring.** `useAudioEngine` + `useEngineFrame`. Transport
controls; live retune; drift value-curve scheduling on play; per-layer vol; iso
offset; noise type; live layer power add/remove; mute/solo; per-layer gains.
*Verify:* every current audio behavior + new mute/solo + per-layer vol, all
click-free.

**Phase 6 — Live visuals.** Imperative `onFrame` painting: scrub fill/knob/time,
readouts, band pill, timeline playhead, driven-slider mirroring, pulse, animated
meter (idle + live). *Verify:* 60fps visuals, no React re-render storm; timer
correct in a hidden tab.

**Phase 7 — Sessions.** Save/load/delete via `storage.js`; export downloads +
fills a box; import from text/file; all through `migrate`. *Verify:* round-trip a
saved session and an exported/re-imported JSON.

**Phase 8 — Polish & docs.** Keyboard Space = play/pause; snap grid; finalize
light theme (audit every token in both themes, incl. SVG/canvas colors); a11y
(focus states, `aria-pressed`, labels, theme toggle); responsive/mobile
breakpoints from the mock; edge cases (all layers off, drift endpoints crossing,
rapid toggle). Rewrite **README.md** (build/run steps, new architecture, per-layer
volume & mute/solo, theming/token system, single-file build note; the audio-engine
"How it works" section stays largely valid). *Verify:* `npm run build` → served
`dist/` and single-file `dist/index.html` both work in both themes.

---

## 9. Risks & mitigations

- **60fps + React:** naive per-frame `setState` will thrash. → imperative
  refs/DOM for hot visuals (§6); React only for coarse state.
- **Losing an engine invariant during the port** (e.g. accidentally setting
  `osc.frequency` directly, or breaking the audio-clock end). → port logic
  verbatim first, refactor second; keep the two-node design; test the
  backgrounded-tab end explicitly.
- **Per-layer volume regressions vs old master model.** → migration maps
  `volume`→`tone.vol`; verify old saved sessions sound the same.
- **`file://` promise broken.** → `vite-plugin-singlefile` restores single-file
  delivery; document the change.
- **Dual-slider/click-to-edit fiddliness (pointer capture, blur/commit, Escape).**
  → reuse the mock's already-working `initDual`/`_editing` logic, adapted to React
  (refs + one dispatch on commit), rather than reinventing.
- **Mute/solo interaction with live power toggles** producing clicks or stuck
  gains. → single `setLayerMix` that always recomputes effective gain from
  {power, mute, any-solo} and ramps with `setTargetAtTime`.

## 10. Definition of done

- `npm run dev` serves the app; `npm run build` produces both a normal `dist/`
  and a working single-file `dist/index.html`.
- UI matches `mock-2.html`; every current audio feature works, plus per-layer
  volume and mute/solo; drift, iso, noise, pause, and backgrounded-tab session end
  all behave; sessions save/load/export/import (with v1→v2 migration).
- Components are reused, not duplicated (one `Layer`, one `DriftCard`, one set of
  primitives). All color flows through semantic tokens; **light + dark** themes
  both ship and switch instantly with zero layout shift; adding a theme needs only
  a new token block. Space toggles play/pause.
- README updated. `prototypes/` and `REPORT.md` left intact.
</content>
</invoke>
