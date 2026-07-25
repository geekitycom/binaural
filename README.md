# Binaural

A web-based binaural beat generator — a free, self-contained alternative to
Holosync-style meditation/focus programs. Entirely client-side: no backend, no build
step, no dependencies, no tracking. The whole app is a single file, `index.html`.

> **Headphones required.** A binaural beat only exists when each ear hears a slightly
> different tone. Over speakers the two tones mix in the air and the effect cancels.

## What it is

Two sine tones are played, one hard-panned to each ear:

- **Left ear** = the _carrier_ frequency.
- **Right ear** = carrier + _beat_ frequency.

Your brain perceives the difference between the two as a slow pulsing "beat" at the beat
frequency, even though neither ear is actually playing it. The beat frequency is what
maps to the classic brainwave bands (delta/theta/alpha/beta/gamma).

## Running it

Open `index.html` in any modern browser (Chrome, Firefox, Safari). Web Audio works
directly from `file://`, so you can just double-click the file — no server needed.

Put on headphones, pick a preset or dial in a beat frequency, and press **Play**
(spacebar also toggles play/pause).

## Features

**Core tones**

- Carrier frequency (50–500 Hz) and beat frequency (0.5–40 Hz) sliders.
- Master volume and session duration (1–180 min).
- Play / Pause / Stop, a counting-down session timer, and a live readout of carrier,
  beat, left/right Hz, and the current brainwave band (color-coded pill).

**Brainwave presets**

- Delta / Theta / Alpha / Beta buttons set the **beat** frequency (a preset is a
  brainwave-band choice, which is a beat — it leaves the carrier tone alone).
- Presets are disabled while beat-frequency drift is active, since the drift owns the
  beat then.

**Frequency drift (session progression)**

- Gradually move the beat frequency across the session. Shapes: `linear`, `ease`
  (ease-in-out smoothstep), and `stepped` (a plateau staircase with smoothed transitions
  between steps).
- Independent carrier-frequency drift with its own start/end/shape/plateaus.
- A one-click **"Relaxation descent"** preset: beat drifts Alpha 10 Hz → Theta 5 Hz over
  20 minutes, ease shape (beat only; leaves the carrier untouched).
- A planned-curve graph shows shaded brainwave-band zones behind the beat curve, a dashed
  secondary line for carrier drift, and a live position marker during playback.
- While a parameter is drifting, its slider is inert (the curve is pre-scheduled), but
  during playback the slider tracks the live curve value so it always reflects reality,
  then returns to its pre-play value when the session ends. The _other_ slider stays
  live — e.g. during a beat drift you can still adjust the carrier mid-session.

**Ambient noise layer**

- Optional white / pink / brown noise, with independent volume (scaled by master).
- Can be toggled on/off and switched between types live during a session, all fades
  click-free.

**Visuals**

- A pulsing circle synced to the current beat frequency, colored by band — animates at
  idle from the configured beat and live during playback.

**Sessions & config**

- Save named sessions to `localStorage`; load or delete them.
- Export the current config to a JSON file (also filled into a textarea), and import
  from pasted text or a file.

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

The graph's band-zone shading uses Delta 0.5–4, Theta 4–8, Alpha 8–14, Beta 14–30.

## How it works (architecture)

The app is a single `index.html`: HTML + inline CSS + inline JS (an IIFE under
`"use strict"`). A few design decisions are worth understanding before modifying it.

### Audio graph

```
carrierSrc (ConstantSource) -> leftOsc.frequency  \  leftOsc  (sine) -> leftPan  (pan -1) -\
                            \-> rightOsc.frequency  } rightOsc (sine) -> rightPan (pan +1) --> toneGain (fade env) -> master (vol) -> destination
beatSrc    (ConstantSource) -> rightOsc.frequency /
noiseSrc   (looped buffer)  -> noiseGain (indep) ---------------------------------------------> master
```

Frequencies are **not** set on the oscillators directly. Both `leftOsc.frequency` and
`rightOsc.frequency` have intrinsic value 0 and are driven by two `ConstantSourceNode`s
summed in: `carrierSrc` feeds both ears (so left = carrier) and `beatSrc` feeds only the
right ear (so right = carrier + beat). This split is what lets the carrier and beat be
controlled independently at runtime.

- `master.gain` — master volume (also scales the noise layer).
- `toneGain` — fade-in / fade-out envelope for the tones (starts at 0).
- `noiseGain` — independent noise level, fades in/out with the session.

### Config shape

`readConfig()` produces (and `applyConfig()` consumes) this object, which is also the
export/import and `localStorage` JSON shape:

```
{ carrier, beat, volume(0..1), duration(min),
  drift{on,start,end,shape,plateaus},
  carrierDrift{on,start,end,shape,plateaus},
  noise{on,type,vol(0..1)}, name? }
```

### Click-free audio via AudioParam scheduling

Audio parameters are always changed through AudioParam scheduling, never raw value
assignment mid-playback:

- **Fades** use gain ramps on `toneGain` (0.5 s fade-in from 0→1; a matching fade-out).
- **Drift** is `setValueCurveAtTime` on the relevant offset — `carrierSrc.offset` for
  carrier drift, `beatSrc.offset` for beat drift — sampling the planned curve at ~2
  points/sec (clamped to 32..20000 points) via `sampleCurve()`. Linear interpolation
  between samples avoids zipper noise.
- **Live retune** (moving a slider while playing) uses `setTargetAtTime` (~0.02 s) on the
  corresponding offset. Because carrier and beat live on separate nodes, each is editable
  live whenever _its own_ drift is off. A drifting parameter's slider is faded
  (`pointer-events:none`) so its running value-curve is never disturbed — the render loop
  only _writes_ the live curve value into that faded slider for display, never the
  reverse. You cannot `linearRamp`/`setTarget` over a `setValueCurveAtTime` on the same
  param, which is exactly the collision the two-node design avoids.
- The `stepped` drift shape smooths each plateau-to-plateau transition (smoothstep over
  the last 35% of each plateau) so there are no vertical jumps.

### End-of-session runs on the audio clock

`requestAnimationFrame` is throttled or paused when a browser tab is hidden, but a
meditation timer must still end correctly if the user switches tabs. So `startAudio()`
pre-schedules, in AudioContext time, both the end fade-out and `oscillator.stop()` for
each source. Teardown and UI reset happen in `leftOsc.onended` (`onEnded()`), which fires
on the audio thread regardless of tab focus. `requestAnimationFrame` is used only for
visuals (graph marker, pulse), plus a `setInterval(500 ms)` fallback so the timer display
keeps updating in a background tab.

### Pause / resume

Pause is `AudioContext.suspend()` and resume is `.resume()`. Suspending freezes
`AudioContext.currentTime`, which automatically freezes the timer (computed as
`currentTime - startTime`), every scheduled ramp, and the pre-scheduled stop time — so
pause works across the whole timeline with no extra bookkeeping.

### Canvas coordinate space

`setupCanvas()` sizes each canvas backing store to CSS-size × `devicePixelRatio` and
applies `setTransform(dpr, …)`. The draw functions therefore work in **logical (CSS)
pixels** — `drawGraph`/`drawPulse` use `clientWidth` and fixed logical heights (240 /
140), not `canvas.width`/`.height` (backing pixels). Keep this convention if you touch the
canvases, or retina displays will double-scale everything.
