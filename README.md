# Binaural — Session Studio

A web-based binaural beat generator — a free, self-contained alternative to
Holosync-style meditation/focus programs. Entirely client-side: no backend, no
accounts, no tracking. It is now a small **Vite + React** app (v2), rebuilt as a
DAW-style mixer + timeline "Session Studio", while keeping the original,
carefully-tuned Web Audio engine intact.

> **Headphones required** for the binaural beat — it only exists when each ear hears a
> slightly different tone; over speakers the two mix in the air and the effect cancels.
> (The optional isochronic pulse is the exception: it's an audible modulation that works
> on speakers too.)

## What it is

Two sine tones are played, one hard-panned to each ear:

- **Left ear** = the _carrier_ frequency.
- **Right ear** = carrier + _beat_ frequency.

Your brain perceives the difference between the two as a slow pulsing "beat" at the beat
frequency, even though neither ear is actually playing it. The beat frequency is what
maps to the classic brainwave bands (delta/theta/alpha/beta/gamma).

## Running & building

This version has a build step (Vite). You need Node.js.

```sh
npm install       # install dependencies (once)
npm run dev       # start the dev server with HMR (http://localhost:5173)
npm run build     # produce a self-contained dist/index.html
npm run preview   # serve the built output locally to sanity-check it
```

**Single-file output.** The production build uses
[`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) to
inline **all** JS and CSS into one `dist/index.html` with zero external assets. So even
though development needs a build step, the delivered artifact is still a single file you
can **open directly — no server, no dependencies** — preserving the project's original
"just open one file" property. (See `vite.config.js` for the plugin setup.)

**Legacy app.** The original single-file vanilla-JS app is preserved verbatim as
[`legacy.html`](legacy.html) — open it in any browser and it still works from `file://`.
The React version is the maintained one; `legacy.html` is kept for reference.

Put on headphones, pick a preset or dial in a beat frequency, and press **Play**
(the **Space** bar also toggles play/pause).

## Features

**Per-layer mixer** — three independent layers, each with its own volume slider and a
**Power** (ON/OFF) toggle, like tracks in a DAW:

- **Binaural / Monaural tone** — carrier (50–500 Hz) and beat (0.5–40 Hz), with its own
  volume. May be powered off entirely. A **mode** switch chooses how the two tones are
  placed:
  - **Binaural** (default) hard-pans the carrier to the left ear and carrier+beat to the
    right — the beat is a phantom percept, so **headphones are required**.
  - **Monaural** sums both tones to center in both ears, so they physically beat. This is
    **audible on speakers** (no headphones), produces a stronger neural response (Oster),
    and stays clean in **gamma**, where binaural perception degrades above ~30 Hz.
  Switching modes mid-session just ramps the two pan positions, click-free; the layer
  header relabels **Binaural tone ↔ Monaural tone** to match.
- **Isochronic pulse** — a directly-audible sine tone gated on/off at the beat rate
  (works on speakers, no headphones needed), with its own volume and a carrier offset so
  it can sit at a different pitch. Default off.
- **Background noise** — white / pink / brown, with its own volume. Default off.

Power is part of the saved config. Any layer can be toggled, switched, or re-leveled
**live mid-session**, all fades click-free. Numeric readouts on the layer controls (and
the drift controls) are **click-to-edit** — click a value and type an exact number.

**Transport & readouts** — Play / Pause / Stop, a scrub bar, a counting session timer,
and live readouts of carrier, beat, left/right Hz, and the current brainwave band
(a color-coded pill).

**Brainwave presets** — Delta / Theta / Alpha / Beta / Gamma buttons set the **beat**
frequency. **Gamma** (40 Hz) also flips the tone to **Monaural**, since binaural beats
degrade above ~30 Hz — the honest way to deliver a gamma beat. Disabled while beat drift
is active (the drift owns the beat then). Dialing the beat into gamma while still in
binaural mode surfaces an inline hint to switch to Monaural or add the isochronic pulse.

**Frequency drift (session progression)** — gradually move a frequency across the
session, edited with a **dual-handle slider** (drag either end, or click a number to
type it) plus a live SVG **timeline**:

- Independent **beat drift** and **carrier drift**, each with start/end, a **shape**
  (`linear`, `ease` = ease-in-out smoothstep, or `stepped` = a smoothed plateau
  staircase), and a plateau count for the stepped shape.
- Handles may cross — a descent (10→5) shows a ↓ cue; the timeline curve and Hz axis
  update live.
- The timeline plots **absolute frequency (Hz)** on the Y axis: a **left-ear line**
  (`carrier`) and a **right-ear line** (`carrier + beat`), both sampled from the same
  model the audio plays (not a decorative approximation). The **gap** between the lines
  _is_ the beat, filled with a ribbon colored by the beat's brainwave band at each moment
  (so it recolors along time as the beat crosses band thresholds). A live playhead rides
  both lines during playback.
- **Both drifts are draggable on the graph:** the right-ear endpoints set **beat drift**
  (start/end) — two-way bound to the beat dual slider — and the left-ear endpoints set
  **carrier drift**, so turning on carrier drift slopes the left line right on the axis.
- While a parameter is drifting its slider is inert (the curve is pre-scheduled), but
  during playback it tracks the live curve value; the _other_ parameter stays live-editable.

**Timeline & visuals** — the SVG timeline hero is rendered directly (imperatively) so
60fps painting never touches the React reconciler.

**Sessions & config** — save named sessions to `localStorage`; load or delete them;
**export** the current config to a JSON file and **import** one back. Imported and
hand-edited JSON is sanitized (missing fields filled, values clamped) on the way in.

**Light / dark theme** — a token-based theming system with light and dark themes that
switch instantly (including the SVG timeline). Follows your OS preference by
default; the transport-bar toggle overrides and persists your choice.

**Keyboard** — **Space** toggles play/pause globally (ignored while typing in a field or
when a button is focused, so it never hijacks the focused control).

## Brainwave bands

Beat frequency, as classified by `band()`:

| Band  | Range (Hz) | Typical association |
| ----- | ---------- | ------------------- |
| Sub-δ | < 0.5      | —                   |
| Delta | < 4        | deep sleep          |
| Theta | < 8        | meditation          |
| Alpha | < 14       | relaxation          |
| Beta  | < 30       | focus               |
| Gamma | ≥ 30       | —                   |

The timeline's gap-ribbon coloring uses Delta <4, Theta 4–8, Alpha 8–14, Beta 14–30, Gamma ≥30.

## Architecture

The app splits into a **framework-agnostic audio engine** (imperative, owns the
`AudioContext` and node graph, is the timing authority) and a **React UI** (declarative,
owns config state, calls engine methods on user events, and reads engine-published live
values for visuals).

```
src/
  main.jsx  App.jsx            # entry + layout shell (providers, Space shortcut)
  audio/
    AudioEngine.js             # THE engine (Web Audio) — no DOM/React
    noise.js                   # makeNoiseBuffer(ctx, type) — white/pink/brown
    curves.js                  # interp(), sampleCurve(), beatAt(), carrierAt()
  lib/
    bands.js  config.js  storage.js  cx.js
  state/
    configReducer.js  ConfigContext.jsx   # useReducer + context
  theme/
    tokens.css  themes.css  ThemeContext.jsx  useTheme.js
  hooks/
    useAudioEngine.js          # config <-> engine bridge; coarse transport state
    useEngineFrame.js          # subscribe to engine frames for imperative visuals
  components/
    primitives/…               # Slider, IconButton, SegControl, Toggle,
                               #   EditableNumber, Panel, BandPill, ColorDot, ThemeToggle
    TransportBar, LayersPanel, Layer, MixSlider, *LayerBody,
    SavedSessions, Timeline, TimelineToolbar, DriftCard, DualSlider, Toast
  styles/base.css              # structural/layout CSS (no literal colors)
```

**Reuse over duplication.** The three mixer layers share one generic `Layer`
(power header) and compose their bodies from the same `MixSlider` /
`SegControl` primitives. `DriftCard` is a single component rendered twice (beat &
carrier). Every raw control (range input, icon button, segmented control, toggle,
click-to-edit number) exists exactly once under `primitives/`.

### React state & the render loop

- **Config** lives in `useReducer(configReducer, DEFAULT_CONFIG)` behind
  `ConfigContext` — the single source of truth for the timeline, drift cards, and layers.
  Every form control dispatches an action.
- **`useAudioEngine`** owns one `AudioEngine`, exposes `play/pause/stop`, and forwards
  config-slice changes to engine methods (slider → `setBeat`, power → `setLayerPower`,
  vol → `setLayerVol`, …).
- **`useEngineFrame`** subscribes to `engine.onFrame`. **High-frequency visuals never use
  React state** — the callback writes straight to refs/DOM/SVG (scrub fill/knob, readouts,
  band pill, timeline playhead, live drift thumbs). Only coarse state (playing flag, ~2/s timer text)
  goes through `setState`, keeping 60fps off the reconciler.

### The audio engine (how it works)

The engine preserves the original app's hard-won correctness properties:

#### Audio graph

```
carrierSrc (ConstantSource) -> leftOsc.frequency        leftOsc  (sine) -> leftPan  (-1) -\
                            \-> rightOsc.frequency       rightOsc (sine) -> rightPan (+1) --> toneEnv -> toneVol -\
beatSrc    (ConstantSource) -> rightOsc.frequency                                                                 \
                                                                                                                   \
noiseSrc (looped buffer) -> noiseEnv -> noiseVol -----------------------------------------------------------------> master (unity) -> destination
                                                                                                                   /
isoOsc (sine, freq = carrierSrc + isoOffsetSrc) -> isoGate -> isoEnv -> isoVol -----------------------------------/

gateLFO (sine, freq driven by beatSrc) -> gateDepth -> isoGate.gain   (raised-cosine gate at the beat rate)
endSrc  (silent ConstantSource) -> onended -> teardown               (audio-clock session timer; NOT in the audio path)
```

Frequencies are **not** set on the oscillators directly. `leftOsc.frequency` and
`rightOsc.frequency` have intrinsic value 0 and are driven by two `ConstantSourceNode`s
summed in: `carrierSrc` feeds both ears (so left = carrier) and `beatSrc` feeds only the
right ear (so right = carrier + beat). This split is what lets the carrier and beat be
scheduled/edited independently without value-curve collisions. (`carrierSrc` also drives
`isoOsc.frequency`, alongside `isoOffsetSrc`.)

The two `StereoPannerNode`s implement the **binaural/monaural** mode: binaural pans
`leftPan`/`rightPan` to −1/+1 (one tone per ear, phantom beat); monaural pans both to 0
so the tones sum into one physically-beating signal (works on speakers). `setToneMode()`
ramps the two pan params (`setTargetAtTime`, ~0.02 s) so the switch is click-free and the
node graph is otherwise unchanged.

Each layer routes through its own gain chain: `source → envelopeGain → layerVolGain →
master`. `master` is pinned at unity (headroom only) — there is **no** master volume;
every layer carries its own volume.

#### Click-free audio via AudioParam scheduling

Audio parameters are always changed through AudioParam scheduling, never raw assignment
mid-playback:

- **Fades** are gain ramps on each layer's envelope gain (peak 1; volume lives on the
  separate `layerVolGain`).
- **Drift** is `setValueCurveAtTime` on the relevant offset — `carrierSrc.offset` for
  carrier drift, `beatSrc.offset` for beat drift — sampling the planned curve at ~2
  points/sec (clamped 32..20000) via `sampleCurve()`; linear interpolation avoids zipper
  noise. The `stepped` shape smooths each plateau-to-plateau transition.
- **Live retune** (moving a slider while playing) uses `setTargetAtTime` (~0.02 s) on the
  corresponding offset. A drifting parameter's slider is inert so its value-curve is never
  disturbed; the render loop only _writes_ the live curve value into that slider for
  display.
- **Layer volume** is a short `setTargetAtTime` (~0.05 s) on each layer's `layerVolGain`,
  so re-leveling a track live never clicks.
- **Layer power** live-adds or live-removes a layer's actual nodes (`setLayerPower`),
  fading its envelope gain in/out so a track can be toggled mid-session click-free.
- **Isochronic gate** — a sine LFO whose frequency is driven by the _same_ `beatSrc`,
  feeding a raised-cosine (`0.5 + 0.5·sin`) gain envelope. Because it reads `beatSrc`, the
  pulse rate tracks drift and live edits for free, and the smooth envelope reaches zero at
  the troughs with no click. The iso carrier is `carrierSrc + isoOffsetSrc`.

#### End-of-session runs on the audio clock

`requestAnimationFrame` is throttled/paused when a tab is hidden, but a meditation timer
must still end correctly. So `start()` pre-schedules, in AudioContext time, the end
fade-out and every `stop()`. A dedicated `endSrc` ConstantSource's `onended` runs
teardown on the audio thread regardless of tab focus (so the session ends correctly even
with the tone layer powered off). `requestAnimationFrame` is visuals-only, plus a
`setInterval(500 ms)` fallback keeps the timer alive in a background tab.

#### Pause / resume

Pause is `AudioContext.suspend()` and resume is `.resume()`. Suspending freezes
`AudioContext.currentTime`, which automatically freezes the timer, every scheduled ramp,
and the pre-scheduled stop time — so pause works across the whole timeline with no extra
bookkeeping.

#### SVG / imperative visuals

The timeline is SVG drawn from real model values; the playhead, scrub, and
readouts are updated imperatively per frame (refs → attributes), never via React state.
All colors are CSS **tokens** (`var(--…)`), so the SVG re-tints instantly on a theme flip
with no redraw code.

### Config shape

The saved / exported JSON shape:

```
{ name?, duration,                            // duration in minutes (1–180)
  tone:  { on, mode, carrier, beat, vol },     // mode: 'binaural' | 'monaural'
  drift: { on, start, end, shape, plateaus },
  carrierDrift: { on, start, end, shape, plateaus },
  iso:   { on, offset, vol },
  noise: { on, type, vol } }
```

- `clampConfig` / `validate` (`lib/config.js`) fill any missing fields from
  `DEFAULT_CONFIG` and centralize all range clamps (carrier 50–500, beat 0.5–40,
  duration 1–180, vols 0–1, iso offset −100..100, plateaus 2–12) plus enum coercion
  (tone mode binaural/monaural, drift shape, noise type) and never throw.
  This runs on **every** `localStorage` read and **every** import, so partial or
  hand-edited JSON always loads clean.

### Theming (token system)

Color is fully token-driven, in three layers:

- **`styles/base.css`** — all structural/layout rules and class names. **Contains no
  literal colors**; every color is a `var(--token)`.
- **`theme/tokens.css`** — the semantic token _catalog_ (e.g. `--surface`, `--border`,
  `--text`, `--accent`, `--band-delta…--band-gamma`, mixer-state tints, glows) plus the
  theme-neutral tokens (typography). Documents the contract; holds no color values.
- **`theme/themes.css`** — the token _values_, one block per theme under
  `:root[data-theme="dark"]` and `:root[data-theme="light"]`. **This is the only file
  where literal colors live.**

`ThemeContext` sets `data-theme` on `<html>` (defaulting to `prefers-color-scheme`,
overridable and persisted). Switching only flips that one attribute, so it is instant and
affects the whole tree including SVG. **Adding a new theme is one more block in
`themes.css` and zero component changes.**
</content>
</invoke>
