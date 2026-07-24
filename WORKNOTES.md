# Binaural — work notes / handoff

A web-based binaural beat generator (free alternative to Holosync-style programs).
Pure client-side, no backend, no build step, no dependencies.

## Current state

**Everything below is implemented and was verified working live in Chrome (no console
errors on any tested path).** The entire app is a single file: `index.html`.

Open it by double-clicking `index.html` — Web Audio works on `file://` in a normal
browser. (Note: the Claude-in-Chrome automation extension blocks `file://`, so during
development it was served with `python3 -m http.server` over `http://localhost`. That
server is not part of the project and is not running.)

## File layout

- `index.html` — the whole app (HTML + inline CSS + inline JS, IIFE, `"use strict"`).
  There is intentionally nothing else. If you split it up later, keep the audio engine
  and the AudioParam-scheduling approach intact (see "Key design decisions").
- `WORKNOTES.md` — this file.

## What the app does (feature list, all working)

Core:
- Two sine `OscillatorNode`s, hard-panned via `StereoPannerNode` (pan -1 / +1).
  Left = carrier Hz, Right = carrier + beat Hz.
- Carrier freq (50–500 Hz slider), beat freq (0.5–40 Hz slider), master volume,
  session duration (1–180 min).
- Play / Pause / Stop. Spacebar toggles play/pause (ignored while typing in a field).
- Session timer counts down; pause freezes it, resume continues.
- Live readout: carrier, beat, L/R Hz, and brainwave-band pill (color-coded).

Presets:
- Delta / Theta / Alpha / Beta buttons auto-fill carrier + beat.

Drift (session progression):
- Beat-frequency drift over the session. Shapes: `linear`, `ease` (ease-in-out
  smoothstep), `stepped` (plateau staircase with smoothed transitions between steps).
- Independent carrier-frequency drift (own start/end/shape/plateaus).
- Default "Relaxation descent" preset button: Alpha 10 Hz → Theta 5 Hz over 20 min, ease.
- Planned-curve `<canvas>` graph: shaded brainwave-band zones behind the beat curve,
  dashed secondary line for carrier drift, live position marker during playback.
- While beat drift is enabled the beat slider is visually disabled (curve is
  pre-scheduled; live beat edits are ignored during a drift session — see below).

Visuals:
- Pulsing circle canvas synced to the current beat frequency (amplitude-envelope pulse),
  colored by band. Animates at idle from the configured beat, and live during playback.

Extras (all working):
- Background noise layer: white / pink (Paul Kellet filter) / brown, looped 4s buffer,
  independent volume, scaled by master.
- Save named sessions to `localStorage` (key `binaural.presets.v1`); load / delete.
- Export current config to JSON (downloads a file AND fills the textarea).
- Import from the textarea (paste) or from a file. Round-trip verified.

## Key design decisions (the non-obvious stuff — read before refactoring)

1. **Click-free audio is a hard requirement and is handled by AudioParam scheduling
   only — never raw value assignment mid-playback.**
   - Start: 0.5 s (`FADE`) gain fade-in on `toneGain` from 0→1.
   - Drift: `setValueCurveAtTime` on each oscillator's `frequency` param, sampling the
     planned curve at ~2 points/sec (clamped 32..20000). Linear interpolation between
     points = no audible stepping / zipper noise.
   - Non-drift live retune (moving carrier/beat sliders while playing): uses
     `linearRampToValueAtTime` over 30 ms.
   - Volume/noise-volume live changes use `setTargetAtTime`.
   - `stepped` drift shape deliberately smooths each plateau-to-plateau transition
     (smoothstep over the last 35% of each plateau) so there are no vertical jumps.

2. **End-of-session runs on the AUDIO CLOCK, not on requestAnimationFrame — deliberate.**
   `requestAnimationFrame` is throttled/paused when the browser tab is hidden. A
   meditation timer must still end correctly if the user switches tabs. So at
   `startAudio()` we PRE-SCHEDULE, in AudioContext time:
   - the end fade-out ramp on `toneGain` (and noise gain), and
   - `oscillator.stop(tEnd + 0.05)` for both oscillators (and noise source).
   Teardown/UI-reset happens in `leftOsc.onended` (`onEnded()`), which fires on the
   audio thread regardless of tab focus.
   `requestAnimationFrame` is used ONLY for visuals (graph marker, pulse) plus a
   `setInterval(500ms)` fallback so the timer display keeps updating in a background tab.
   **Do not move end-detection back into the rAF loop.**

3. **Pause = `AudioContext.suspend()`, resume = `.resume()`.**
   Suspending freezes `AudioContext.currentTime`, which automatically freezes: the timer
   (computed as `currentTime - startTime`), all scheduled ramps, and the pre-scheduled
   stop time. So pause "just works" across the whole timeline without extra bookkeeping.

4. **Autoplay/gesture:** `startAudio()` creates the context inside the Play click
   handler and calls `ctx.resume()` if suspended. During dev I saw the timer appear
   "frozen" once — that turned out to be an automation click that MISSED the Play button
   (session never started), NOT an autoplay problem. A real fresh AudioContext started
   `running` here. Keep the `resume()` guard anyway.

5. **Canvas coordinate space:** `setupCanvas()` sizes the backing store to CSS-size ×
   devicePixelRatio and applies `setTransform(dpr,...)`. The draw functions therefore
   work in LOGICAL (CSS) pixels — `drawGraph`/`drawPulse` use `clientWidth` and fixed
   logical heights (240 / 140), NOT `canvas.width`/`.height` (which are backing pixels).
   Mixing those up double-scales everything on retina. There was a bug here that's fixed;
   keep the logical-pixel convention if you touch the canvases.

## Audio graph

```
leftOsc  (sine, freq=carrier)       -> leftPan  (pan -1) -\
rightOsc (sine, freq=carrier+beat)  -> rightPan (pan +1) --> toneGain (fade env) -> master (vol) -> destination
noiseSrc (looped buffer)            -> noiseGain (indep) --------------------------> master
```

- `master.gain` = master volume (also scales noise).
- `toneGain` = fade-in / fade-out envelope for the tones (starts at 0).
- `noiseGain` = independent noise level, also fades in/out with the session.
- `session = { cfg, durationSec, startTime, endFade }`; `startTime` is in AudioContext time.
- Config shape (also the export/import + localStorage JSON shape) is produced by
  `readConfig()` / consumed by `applyConfig()`:
  `{ carrier, beat, volume(0..1), duration(min), drift{on,start,end,shape,plateaus},
     carrierDrift{on,start,end,shape,plateaus}, noise{on,type,vol(0..1)}, name? }`

## Brainwave bands (in `BANDS` / `band()`)

Sub-δ <0.5 · Delta <4 · Theta <8 · Alpha <14 · Beta <30 · Gamma ≥30 (Hz, beat freq).
Graph band-zone shading uses Delta 0.5–4, Theta 4–8, Alpha 8–14, Beta 14–30.

## How to run / test

- **Run:** open `index.html` in Chrome/Firefox/Safari. Headphones required for the
  effect (each ear must hear a different tone — speakers mix and cancel it). There's a
  prominent in-app warning banner about this.
- **Manual smoke test:** pick Alpha preset → Play → confirm timer counts down and you
  hear a low tone with a slow beat. Load "Relaxation descent" → confirm the graph shows a
  descending curve → Play → confirm the marker tracks along it.
- No automated tests exist. No lint/build tooling.

## Verified during this session

- Non-drift play: timer counts down, L/R = carrier / carrier+beat.
- Drift play (stepped beat + carrier drift): `setValueCurveAtTime` scheduling, no errors,
  readout tracks the curve start (carrier 150, L/R 150/160, band Alpha).
- Pause freezes timer; resume advances it; label toggles to "Resume".
- Stop resets UI (timer back to full, Play re-enabled) via the same `onEnded()` path.
- Save → localStorage; Export → valid JSON with drift fields; Import round-trip restores
  every field including nested drift/carrierDrift.
- Noise-layered playback starts with no errors (buffer generation OK).
- Graph renders both ease-in-out and stepped-plateau curves with band zones + dashed
  carrier line.

## NOT fully tested / known gaps / next steps

- **Natural end-of-session** (letting the timer hit 0:00) was NOT exercised live because
  the minimum duration is 1 min. The code path is: pre-scheduled fade + pre-scheduled
  `stop()` + `onEnded()`. The identical teardown was verified via the manual Stop path,
  so this is low-risk but unproven end-to-end. Consider adding a temporary sub-minute
  duration option to test it, or just watch one real 1-minute session finish.
- Cross-browser: written to standard Web Audio (`StereoPannerNode` constructor form,
  `setValueCurveAtTime`). Verified in Chrome only this session. Safari/Firefox expected to
  work but untested — worth a quick check, especially Safari's stricter autoplay.
- No favicon, no PWA/offline manifest, no meta description — nice-to-haves if this becomes
  a real hosted page.
- Possible future ideas raised implicitly by the spec but not built: ambient nature-sound
  files (only synthesized noise is implemented), sharing drift curves via URL, more drift
  shapes.

## Git

Repo was NOT initialized during this session (working dir reported `Is a git repository:
false`). User is about to create a remote and continue on another machine. Nothing is
committed yet. There are no secrets or generated artifacts to gitignore — the whole
project is `index.html` + this file.
