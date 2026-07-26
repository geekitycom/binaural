// AudioEngine — framework-agnostic port of legacy.html's Web Audio engine.
//
// Ported to preserve every correctness property of the original (see PLAN §5):
//  - Two-ConstantSourceNode frequency drive: carrierSrc -> both oscillators,
//    beatSrc -> right oscillator only. Oscillator intrinsic frequency stays 0;
//    we never write osc.frequency directly. Carrier + beat stay independently
//    live-editable and drift-schedulable without value-curve collisions.
//  - Click-free changes: envelope ramps for fades; setValueCurveAtTime for drift
//    (sampled ~2 pts/s, clamped 32..20000); setTargetAtTime (~0.02s) for retune.
//  - Isochronic gate: a sine LFO driven by the SAME beatSrc, raised-cosine gate
//    (0.5 + 0.5*sin) so pulse rate tracks drift/live edits with no hard edges.
//    iso carrier = carrierSrc + isoOffsetSrc.
//  - Audio-clock session end: end fade-out + every .stop() pre-scheduled on the
//    audio clock; teardown runs from an onended callback (fires on the audio
//    thread regardless of tab focus); setInterval(500ms) keeps the frame/timer
//    alive in a backgrounded tab; requestAnimationFrame is visuals-only.
//  - Pause/resume via ctx.suspend()/ctx.resume().
//  - Live add/remove of every layer mid-session, click-free.
//
// New for the mock (PLAN §5):
//  - Per-layer gain chain: source -> envelopeGain -> layerVolGain ->
//    master(=unity) -> destination. The binaural tone gets its own toneVolGain
//    (new); noise/iso keep their vol gains.
//  - setLayerVol / setLayerPower for all three layers.
//  - The binaural (tone) layer may be powered off (cfg.tone.on === false).
//
// This module NEVER touches the DOM/canvas/SVG. Live values are pushed to the UI
// only through the assignable onFrame / onEnded callbacks.

import { makeNoiseBuffer } from './noise.js';
import { sampleCurve, beatAt, carrierAt } from './curves.js';
import { band } from '../lib/bands.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FADE = 0.5; // start/stop fade seconds

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;

    // tone layer
    this.leftOsc = null;
    this.rightOsc = null;
    this.leftPan = null;
    this.rightPan = null;
    this.toneEnvGain = null; // envelope (legacy toneGain)
    this.toneVolGain = null; // NEW per-layer volume

    // shared frequency drive (used by tone AND iso)
    this.carrierSrc = null;
    this.beatSrc = null;

    // noise layer
    this.noiseSrc = null;
    this.noiseEnvGain = null;
    this.noiseVolGain = null;

    // iso layer
    this.isoOsc = null;
    this.isoGate = null;
    this.gateLFO = null;
    this.gateDepth = null;
    this.isoOffsetSrc = null;
    this.isoEnvGain = null;
    this.isoVolGain = null;

    // dedicated audio-clock timer that owns teardown. Independent of which
    // layers exist, so the tone layer can be off and the session still ends
    // correctly on a backgrounded tab (legacy hung this on leftOsc.onended).
    this.endSrc = null;

    this.session = null; // {cfg, durationSec, startTime, endFade}
    this.playing = false;
    this.paused = false;
    this.ended = false;
    this.manualStop = false;
    this.rafId = null;
    this.tickId = null;

    // assignable callbacks
    this.onFrame = null; // ({playing,paused,elapsed,remaining,beat,carrier,band})
    this.onEnded = null; // ({completed:boolean})
  }

  // Pan positions per tone mode: [leftOsc pan, rightOsc pan].
  //  binaural -> carrier hard-left, carrier+beat hard-right (phantom beat).
  //  monaural -> both centered so the two tones sum into one beating signal.
  static _panForMode(mode) {
    return mode === 'monaural' ? [0, 0] : [-1, 1];
  }

  // ---------- graph construction ----------
  _buildGraph(cfg) {
    const ctx = this.ctx;

    // master pinned at unity — headroom/limiting only, no volume duty.
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);

    // Frequency drive is ALWAYS built (even when the tone is off) so a live iso
    // add mid-session has carrier/beat to follow. Oscillator intrinsic freq is
    // 0; two ConstantSourceNodes sum into each osc's .frequency param.
    this.carrierSrc = ctx.createConstantSource();
    this.carrierSrc.offset.value = cfg.tone.carrier;
    this.beatSrc = ctx.createConstantSource();
    this.beatSrc.offset.value = cfg.tone.beat;
  }

  // ---------- tone layer ----------
  _spawnTone(cfg, tStart, fadeStart, tEnd) {
    const ctx = this.ctx;
    this.toneEnvGain = ctx.createGain();
    this.toneEnvGain.gain.value = 0; // fade in
    this.toneVolGain = ctx.createGain();
    this.toneVolGain.gain.value = cfg.tone.vol;
    this.toneEnvGain.connect(this.toneVolGain).connect(this.master);

    this.leftOsc = ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.rightOsc = ctx.createOscillator();
    this.rightOsc.type = 'sine';
    // Binaural: hard-pan each tone to one ear (the beat is a phantom percept, so
    // headphones are required). Monaural: both tones summed at center in both
    // ears, so they physically beat — audible on speakers, and cleaner in gamma
    // where binaural perception degrades (Oster's ~30 Hz limit).
    const [lpan, rpan] = AudioEngine._panForMode(cfg.tone.mode);
    this.leftPan = new StereoPannerNode(ctx, { pan: lpan });
    this.rightPan = new StereoPannerNode(ctx, { pan: rpan });
    this.leftOsc.connect(this.leftPan).connect(this.toneEnvGain);
    this.rightOsc.connect(this.rightPan).connect(this.toneEnvGain);

    // carrier drives both ears, beat only the right -> left=carrier,
    // right=carrier+beat. Each on its own node so a live edit to one never
    // collides with a drift value-curve on the other.
    this.leftOsc.frequency.value = 0;
    this.rightOsc.frequency.value = 0;
    this.carrierSrc.connect(this.leftOsc.frequency);
    this.carrierSrc.connect(this.rightOsc.frequency);
    this.beatSrc.connect(this.rightOsc.frequency);

    this._applyEnvelope(this.toneEnvGain.gain, tStart, fadeStart, tEnd);
    this.leftOsc.start(tStart);
    this.rightOsc.start(tStart);
    this.leftOsc.stop(tEnd + 0.05);
    this.rightOsc.stop(tEnd + 0.05);
  }

  // Live add of the tone layer mid-session (power toggled on while playing).
  _startToneLive() {
    if (!this.ctx || !this.session || this.leftOsc) return;
    const now = this.ctx.currentTime;
    const tEnd = this.session.startTime + this.session.durationSec;
    if (now >= tEnd) return;
    const fadeStart = Math.max(this.session.startTime + FADE, tEnd - this.session.endFade);
    this._spawnTone(this.session.cfg, now, fadeStart, tEnd);
  }

  _stopToneLive() {
    if (!this.leftOsc) return;
    const now = this.ctx.currentTime;
    try {
      this.toneEnvGain.gain.cancelScheduledValues(now);
      this.toneEnvGain.gain.setValueAtTime(Math.max(0.0001, this.toneEnvGain.gain.value), now);
      this.toneEnvGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      this.leftOsc.stop(now + 0.35);
      this.rightOsc.stop(now + 0.35);
    } catch (e) { /* already stopped */ }
    // carrierSrc/beatSrc are shared with iso — leave them running.
    this.leftOsc = this.rightOsc = this.leftPan = this.rightPan = null;
    this.toneEnvGain = this.toneVolGain = null;
  }

  // ---------- shared envelope (fade in -> hold -> fade out), peak = 1 ----------
  // Volume lives on the separate layerVolGain, so the envelope always peaks at 1.
  _applyEnvelope(param, tStart, fadeStart, tEnd) {
    const tIn = tStart + FADE;
    param.setValueAtTime(0, tStart);
    if (fadeStart > tIn) {
      param.linearRampToValueAtTime(1, tIn);
      param.setValueAtTime(1, fadeStart);
    } else {
      // little/no room before the session's end fade: ramp in quickly
      param.linearRampToValueAtTime(1, Math.min(Math.max(tStart, tEnd - 0.01), tIn));
    }
    param.linearRampToValueAtTime(0.0001, tEnd);
  }

  // ---------- noise layer ----------
  _spawnNoise(type, vol, tStart, fadeStart, tEnd) {
    const ctx = this.ctx;
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = makeNoiseBuffer(ctx, type);
    this.noiseSrc.loop = true;
    this.noiseEnvGain = ctx.createGain();
    this.noiseEnvGain.gain.value = 0;
    this.noiseVolGain = ctx.createGain();
    this.noiseVolGain.gain.value = vol;
    this.noiseSrc
      .connect(this.noiseEnvGain)
      .connect(this.noiseVolGain)
      .connect(this.master);
    this.noiseSrc.start(tStart);
    this._applyEnvelope(this.noiseEnvGain.gain, tStart, fadeStart, tEnd);
    this.noiseSrc.stop(tEnd + 0.05);
  }

  _startNoiseLive() {
    if (!this.ctx || !this.session || this.noiseSrc) return;
    const now = this.ctx.currentTime;
    const tEnd = this.session.startTime + this.session.durationSec;
    if (now >= tEnd) return;
    const fadeStart = Math.max(this.session.startTime + FADE, tEnd - this.session.endFade);
    const n = this.session.cfg.noise;
    this._spawnNoise(n.type, n.vol, now, fadeStart, tEnd);
  }

  _stopNoiseLive() {
    if (!this.noiseSrc) return;
    const now = this.ctx.currentTime;
    try {
      this.noiseEnvGain.gain.cancelScheduledValues(now);
      this.noiseEnvGain.gain.setValueAtTime(Math.max(0.0001, this.noiseEnvGain.gain.value), now);
      this.noiseEnvGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      this.noiseSrc.stop(now + 0.35);
    } catch (e) { /* already stopped */ }
    this.noiseSrc = this.noiseEnvGain = this.noiseVolGain = null;
  }

  // ---------- iso layer ----------
  // A sine tone gated on/off at the beat rate. Gate LFO frequency is driven by
  // the SAME beatSrc, so pulse rate tracks beat drift/live edits for free. Gate
  // gain is a raised cosine (0.5 + 0.5*sin) -> reaches 0 at troughs with no hard
  // edge -> click-free. iso carrier = carrierSrc + isoOffsetSrc.
  _spawnIso(offset, vol, tStart, fadeStart, tEnd) {
    const ctx = this.ctx;
    this.isoOsc = ctx.createOscillator();
    this.isoOsc.type = 'sine';
    this.isoOsc.frequency.value = 0;
    this.isoOffsetSrc = ctx.createConstantSource();
    this.isoOffsetSrc.offset.value = offset;
    this.carrierSrc.connect(this.isoOsc.frequency); // follows (possibly drifting) carrier
    this.isoOffsetSrc.connect(this.isoOsc.frequency); // + offset
    this.isoGate = ctx.createGain();
    this.isoGate.gain.value = 0.5; // raised-cosine DC base
    this.gateLFO = ctx.createOscillator();
    this.gateLFO.type = 'sine';
    this.gateLFO.frequency.value = 0;
    this.beatSrc.connect(this.gateLFO.frequency); // pulse rate == beat, drift and all
    this.gateDepth = ctx.createGain();
    this.gateDepth.gain.value = 0.5; // swing -> gate gain 0..1
    this.gateLFO.connect(this.gateDepth).connect(this.isoGate.gain);

    this.isoEnvGain = ctx.createGain();
    this.isoEnvGain.gain.value = 0;
    this.isoVolGain = ctx.createGain();
    this.isoVolGain.gain.value = vol;
    this.isoOsc
      .connect(this.isoGate)
      .connect(this.isoEnvGain)
      .connect(this.isoVolGain)
      .connect(this.master);

    this.isoOffsetSrc.start(tStart);
    this.isoOsc.start(tStart);
    this.gateLFO.start(tStart);
    this._applyEnvelope(this.isoEnvGain.gain, tStart, fadeStart, tEnd);
    this.isoOsc.stop(tEnd + 0.05);
    this.gateLFO.stop(tEnd + 0.05);
    this.isoOffsetSrc.stop(tEnd + 0.05);
  }

  _startIsoLive() {
    if (!this.ctx || !this.session || this.isoOsc) return;
    const now = this.ctx.currentTime;
    const tEnd = this.session.startTime + this.session.durationSec;
    if (now >= tEnd) return;
    const fadeStart = Math.max(this.session.startTime + FADE, tEnd - this.session.endFade);
    const iso = this.session.cfg.iso;
    this._spawnIso(iso.offset, iso.vol, now, fadeStart, tEnd);
  }

  _stopIsoLive() {
    if (!this.isoOsc) return;
    const now = this.ctx.currentTime;
    try {
      this.isoEnvGain.gain.cancelScheduledValues(now);
      this.isoEnvGain.gain.setValueAtTime(Math.max(0.0001, this.isoEnvGain.gain.value), now);
      this.isoEnvGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      this.isoOsc.stop(now + 0.35);
      this.gateLFO.stop(now + 0.35);
      this.isoOffsetSrc.stop(now + 0.35);
    } catch (e) { /* already stopped */ }
    this.isoOsc = this.isoGate = this.isoEnvGain = this.isoVolGain = null;
    this.gateLFO = this.gateDepth = this.isoOffsetSrc = null;
  }

  // ---------- drift scheduling on the two frequency sources ----------
  _scheduleFrequencies(cfg, t0, durationSec) {
    if (cfg.carrierDrift.on) {
      this.carrierSrc.offset.setValueCurveAtTime(
        sampleCurve((f) => carrierAt(cfg, f), durationSec), t0, durationSec,
      );
    } else {
      this.carrierSrc.offset.setValueAtTime(cfg.tone.carrier, t0);
    }
    if (cfg.drift.on) {
      this.beatSrc.offset.setValueCurveAtTime(
        sampleCurve((f) => beatAt(cfg, f), durationSec), t0, durationSec,
      );
    } else {
      this.beatSrc.offset.setValueAtTime(cfg.tone.beat, t0);
    }
  }

  // ---------- public: transport ----------
  start(config) {
    // deep-ish clone so live edits don't mutate the caller's config object
    const cfg = this._cloneConfig(config);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    this._buildGraph(cfg);

    const t0 = ctx.currentTime + 0.03;
    const durationSec = cfg.duration * 60;
    const endFade = Math.min(6, Math.max(0.5, durationSec * 0.08));
    const tEnd = t0 + durationSec;
    const fadeStart = Math.max(t0 + FADE, tEnd - endFade);

    this._scheduleFrequencies(cfg, t0, durationSec);
    this.carrierSrc.start(t0);
    this.beatSrc.start(t0);
    this.carrierSrc.stop(tEnd + 0.05);
    this.beatSrc.stop(tEnd + 0.05);

    if (cfg.tone.on) this._spawnTone(cfg, t0, fadeStart, tEnd);
    if (cfg.noise.on) this._spawnNoise(cfg.noise.type, cfg.noise.vol, t0, fadeStart, tEnd);
    if (cfg.iso.on) this._spawnIso(cfg.iso.offset, cfg.iso.vol, t0, fadeStart, tEnd);

    // Dedicated audio-clock end timer -> teardown. Fires on the audio thread
    // regardless of tab focus and regardless of which layers exist.
    this.endSrc = ctx.createConstantSource();
    this.endSrc.offset.value = 0;
    this.ended = false;
    this.manualStop = false;
    this.endSrc.onended = () => this._teardown();
    this.endSrc.start(t0);
    this.endSrc.stop(tEnd + 0.05);

    this.session = { cfg, durationSec, startTime: t0, endFade };
    this.playing = true;
    this.paused = false;
    this._startRender();
  }

  pause() {
    if (!this.ctx || !this.playing) return;
    if (!this.paused) {
      this.ctx.suspend();
      this.paused = true;
    } else {
      this.ctx.resume();
      this.paused = false;
    }
  }

  resume() {
    if (!this.ctx || !this.playing || !this.paused) return;
    this.ctx.resume();
    this.paused = false;
  }

  // manual stop: fade quickly, then stop early. The endSrc.onended -> teardown
  // fires once the sources actually stop.
  stop() {
    if (!this.ctx || this.ended) return;
    this.manualStop = true;
    if (this.paused) {
      this.ctx.resume();
      this.paused = false;
    }
    const now = this.ctx.currentTime;
    const fadeGain = (g) => {
      if (!g) return;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
      g.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    };
    try {
      fadeGain(this.toneEnvGain);
      fadeGain(this.noiseEnvGain);
      fadeGain(this.isoEnvGain);
      if (this.leftOsc) { this.leftOsc.stop(now + 0.35); this.rightOsc.stop(now + 0.35); }
      this.carrierSrc.stop(now + 0.35);
      this.beatSrc.stop(now + 0.35);
      if (this.noiseSrc) this.noiseSrc.stop(now + 0.35);
      if (this.isoOsc) { this.isoOsc.stop(now + 0.35); this.gateLFO.stop(now + 0.35); this.isoOffsetSrc.stop(now + 0.35); }
      this.endSrc.stop(now + 0.35);
    } catch (e) {
      this._teardown();
    }
  }

  // ---------- public: live edits ----------
  setCarrier(hz) {
    if (!this.ctx || !this.carrierSrc || !this.session) return;
    if (this.session.cfg.carrierDrift.on) return; // inert while drifting
    this.session.cfg.tone.carrier = hz;
    this.carrierSrc.offset.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
  }

  setBeat(hz) {
    if (!this.ctx || !this.beatSrc || !this.session) return;
    if (this.session.cfg.drift.on) return; // inert while drifting
    this.session.cfg.tone.beat = hz;
    this.beatSrc.offset.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
  }

  // Switch binaural <-> monaural live by ramping the two pan params (short
  // setTargetAtTime, click-free). The node graph is unchanged — only where each
  // tone sits in the stereo field.
  setToneMode(mode) {
    if (this.session) this.session.cfg.tone.mode = mode;
    if (!this.ctx || !this.leftPan || !this.rightPan) return;
    const now = this.ctx.currentTime;
    const [lpan, rpan] = AudioEngine._panForMode(mode);
    this.leftPan.pan.setTargetAtTime(lpan, now, 0.02);
    this.rightPan.pan.setTargetAtTime(rpan, now, 0.02);
  }

  setIsoOffset(hz) {
    if (this.session) this.session.cfg.iso.offset = hz;
    if (this.isoOffsetSrc && this.session) {
      this.isoOffsetSrc.offset.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
    }
  }

  setNoiseType(type) {
    if (this.session) this.session.cfg.noise.type = type;
    // buffer type can't be crossfaded on one node -> stop + restart live.
    if (this.session && this.noiseSrc) {
      this._stopNoiseLive();
      this._startNoiseLive();
    }
  }

  setLayerVol(layer, v) {
    if (this.session) {
      if (layer === 'tone') this.session.cfg.tone.vol = v;
      else if (layer === 'iso') this.session.cfg.iso.vol = v;
      else if (layer === 'noise') this.session.cfg.noise.vol = v;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = layer === 'tone' ? this.toneVolGain
      : layer === 'iso' ? this.isoVolGain
        : layer === 'noise' ? this.noiseVolGain : null;
    if (g) g.gain.setTargetAtTime(v, now, 0.05);
  }

  // live add/remove of a layer's actual nodes
  setLayerPower(layer, on) {
    if (this.session) {
      if (layer === 'tone') this.session.cfg.tone.on = !!on;
      else if (layer === 'iso') this.session.cfg.iso.on = !!on;
      else if (layer === 'noise') this.session.cfg.noise.on = !!on;
    }
    if (layer === 'tone') on ? this._startToneLive() : this._stopToneLive();
    else if (layer === 'iso') on ? this._startIsoLive() : this._stopIsoLive();
    else if (layer === 'noise') on ? this._startNoiseLive() : this._stopNoiseLive();
  }

  // ---------- render loop (visuals-only rAF + interval for hidden tabs) ----------
  _startRender() {
    const step = () => {
      this.rafId = requestAnimationFrame(step);
      this._emitFrame();
    };
    step();
    this.tickId = setInterval(() => this._emitFrame(), 500);
  }

  _emitFrame() {
    if (!this.ctx || !this.session) return;
    const now = this.ctx.currentTime;
    const { startTime, durationSec, cfg } = this.session;
    const elapsed = clamp(now - startTime, 0, durationSec);
    const frac = durationSec > 0 ? elapsed / durationSec : 0;
    const bt = beatAt(cfg, frac);
    const car = carrierAt(cfg, frac);
    if (this.onFrame) {
      this.onFrame({
        playing: this.playing,
        paused: this.paused,
        elapsed,
        remaining: durationSec - elapsed,
        beat: bt,
        carrier: car,
        band: band(bt),
      });
    }
  }

  // ---------- teardown (fired from endSrc.onended) ----------
  _teardown() {
    if (this.ended) return;
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.tickId) clearInterval(this.tickId);
    this.tickId = null;
    const dying = this.ctx;
    setTimeout(() => { try { dying && dying.close(); } catch (e) { /* noop */ } }, 60);

    const wasManual = this.manualStop;
    this.ctx = null;
    this.master = null;
    this.leftOsc = this.rightOsc = this.leftPan = this.rightPan = null;
    this.toneEnvGain = this.toneVolGain = null;
    this.carrierSrc = this.beatSrc = null;
    this.noiseSrc = this.noiseEnvGain = this.noiseVolGain = null;
    this.isoOsc = this.isoGate = this.isoEnvGain = this.isoVolGain = null;
    this.gateLFO = this.gateDepth = this.isoOffsetSrc = null;
    this.endSrc = null;
    this.session = null;
    this.playing = false;
    this.paused = false;

    if (this.onEnded) this.onEnded({ completed: !wasManual });
  }

  _cloneConfig(config) {
    // structuredClone where available; JSON fallback (config is plain data).
    if (typeof structuredClone === 'function') return structuredClone(config);
    return JSON.parse(JSON.stringify(config));
  }
}
