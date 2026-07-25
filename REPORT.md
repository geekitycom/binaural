# How Commercial Binaural Beat Products Use Carrier and Beat Frequencies: A Technical Reference for Builders

## TL;DR
- **Commercial products cluster around two design philosophies:** low audible carriers (~30–150 Hz, as in Holosync) that "push" hard, versus mid-range carriers (~200–500 Hz, near Oster's perceptual optimum) used by most research and mainstream apps; beat frequencies universally map to the standard EEG bands (delta 0.5–4, theta 4–8, alpha 8–14, beta 14–30, gamma ~40 Hz).
- **Progression is real but modest:** the best-documented product (Holosync) drifts the beat frequency downward ~1 Hz/minute within a session and lowers the carrier ~10 Hz per program level across a multi-year curriculum; most others hold a target band and simply ramp in/out or step between stages.
- **For an open-source app, a defensible default is a ~200–250 Hz carrier, a 15–30 minute session that ramps from a waking band down to the target band and holds, mixed under pink noise or ambient music at low level** — this matches both the reverse-engineered commercial specs and the peer-reviewed literature.

## Key Findings

### The underlying physics (agreed across all sources)
A binaural beat is the perceived difference between two pure tones, one per ear. The constraints were established by Gerald Oster's landmark paper "Auditory Beats in the Brain" (*Scientific American*, September 1973, 229(4):94–102) and confirmed repeatedly since:
- Carrier tones must be **below ~1000 Hz** for the beat to be perceived at all (the wavelength must exceed skull diameter).
- Binaural beats are **best perceived at carriers around 440 Hz.** Oster's exact words: *"Binaural beats are best perceived when the carrier frequency is about 440 hertz; above that frequency they become less distinct and above about 1,000 hertz they vanish altogether. No person I have tested reports hearing beats for frequencies above 900 hertz."*
- The two tones must differ by **less than ~30 Hz.** Per Perrott & Nelson (as cited in the 2023 PLOS ONE review): *"the maximum difference for the two tones must be around 30 Hz. Beyond frequency differences of 30 Hz, the two tones are perceived separately instead of eliciting the percept of a binaural beat."*
- The beat is faint — Oster measured the perceived modulation depth at only **about 3 dB**, and noted that monaural beats produced a much larger neural response than binaural beats in his tests.
- The **Oster Curve** maps optimal carriers to target beats: roughly 160–210 Hz carriers for theta, ~230–240 Hz for ~10 Hz alpha. This is a *perception* curve, not an *entrainment* curve, so it is a starting template, not a rule.

### Holosync (Centerpointe / Bill Harris) — the most thoroughly reverse-engineered
Holosync is the richest source of hard numbers because hobbyists measured the actual tracks. Officially, Centerpointe treats exact carriers as proprietary; the numbers below come from user measurements (notably Jim Peters, author of the open-source SBaGen tool) and forum posts, cross-checked against Centerpointe's own descriptions.

**Carrier frequencies (reverse-engineered):**
- Entry-level "Awakening Prologue" ("Dive") measured at **~140–145 Hz**; the website MP3 demo used **~85 Hz**.
- A widely circulated forum spec claims **Awakening Prologue starts at 150 Hz carrier, dropping 10 Hz per successive level** across 13 levels (A/P, then Awakening 1–4, Purification 1–4, Flowering 1–4), reaching a **low of ~30 Hz at the deepest level**.
- Independent measurements partly conflict with the clean "10 Hz per level" story: one user measured **~89 Hz for Awakening Level 2 and ~59 Hz for Awakening Level 4**; another audio producer states **Awakening Level 4 is 57 Hz**. Centerpointe's founder has reportedly claimed final-level carriers as low as **6–8 Hz** (below the hearing threshold, felt more than heard).
- **Takeaway:** Holosync deliberately uses *unusually low* carriers (well below Oster's 440 Hz optimum) and lowers them across levels as the "progression" mechanism — the theory being lower carriers produce a stronger/deeper entrainment "push."

**Beat frequencies and session structure (reverse-engineered):**
- The 30-minute "Dive" track **drifts the beat from ~20 Hz down toward delta at roughly 1 Hz per minute**, bottoming out around **2 Hz** and holding. Jim Peters' measurement of the entry track showed a stepped descent (~3 min per step): 10 → 9 → 8 → 7 → 6 → 5 → 3.5 → 2.6 Hz.
- The demo track descended **10.2 → 9.1 → 8.0 → 7.0 → 6.0 → 5.3 → 4.4 Hz** over ~18 minutes (~2.5 min per step).
- The companion "Immersion" track **holds a steady low delta beat (~2.0–2.5 Hz) for its full 30 minutes.**
- Deeper program levels reportedly reach beat frequencies as low as **0.2–0.3 Hz**, and add extra low-delta tracks (1.5, 0.5, 0.3 Hz).

**Session/program structure:**
- Daily use: "The Dive" (30 min) alone for the first 14 days; then "The Dive" + "Immersion" back-to-back (60 min) for 4–6 months per level.
- The full "Holosync Solution" is a progressive curriculum: one intro level ("Awakening Prologue") plus twelve levels, ~4–6 months each, ~7 years total.
- **Layering:** binaural tones sit *beneath* a rainforest/rain soundscape plus Tibetan crystal bowls (in "The Dive"); "Immersion" drops the bowls and keeps only rain. Jim Peters noted the binaurals are "plain" sine tones with "no fancy tricks," mixed low (roughly 0.2–0.5% of full-scale amplitude) under the masking audio, with one channel sometimes louder than the other. Later levels add "silent subliminals." Peters' conclusion: the raw binaural technology is simple; the elaborate soundscape, support materials, and daily-habit structure are what make the product "work."

### Hemi-Sync (The Monroe Institute) — multiplexed multi-tone stacks
Hemi-Sync ("hemispheric synchronization"), developed and patented by Robert Monroe in the early 1970s, is technically more complex than Holosync: it **layers multiple simultaneous binaural tone-pairs** ("multiplexed" beats) plus pink noise, surf, music, and verbal guidance.

**Frequencies (from a USENET measurement document redistributed with SBaGen — reverse-engineered, not official):**
The Monroe "Focus Levels" were measured as stacks of carriers each carrying its own beat (notation: `carrier[beat]`):
- **Focus 10** ("mind awake/body asleep"): 100[1.5], 200[4.0], 250[4.0], 300[4.0] — carriers 100–300 Hz, beats in delta/theta.
- **Focus 12** ("expanded awareness"): adds 400[10.0], 500[10.1], 600[4.8] — introduces alpha (10 Hz) beats.
- **Focus 15** ("no time"): 100[1.5], 200[4.0], 250[4.0], 300[4.0], 500[7.05], 630[7.1], 750[7.0] — theta-dominant, carriers up to 750 Hz.
- **Focus 21** (bridge to other states): 200[4.0], 250[4.0], 300[4.0], 600[16.2], 750[15.9], 900[16.2] — introduces beta (~16 Hz) beats, carriers up to 900 Hz.
- **Focus 23–27**: mostly 400–900 Hz carriers with ~4 Hz delta/theta beats, plus very low 0.75 Hz components.
- Amplitudes were maintained roughly **20 dB above the pink-noise/surf background.**
- Crucially, the source notes the Monroe equipment was **analog**, so "precise control of frequency and phase was not possible" — the measured values are approximate.

**Structure/progression:** Monroe uses carriers spanning ~50–900 Hz (much wider and higher than Holosync), stacks several beats at once, and progresses by *changing the tone stack* between Focus Levels rather than by drifting a single beat. A guiding voice leads the listener through each stage. The company has since moved R&D to "Monroe Sound Science," adding phase-modulation techniques it says are smoother between Focus Levels and can target gamma, which plain binaural beats struggle to entrain.

### EquiSync (EOC Institute) — multi-layered, band-targeted, carriers undisclosed
EquiSync comes in three brainwave programs — **EquiSync 1 (Alpha), 2 (Theta), 3 (Delta)** — plus a Gamma program, sold across three tiers (Classic, Deepereum, Element). Unlike Holosync, EOC Institute **explicitly declines to publish the specific carrier/beat frequencies used in each fixed program** — a user testimonial on their own site asks them to disclose frequencies "much like Holosync," and the company does not.

**Officially stated:**
- Program band targets: **Alpha 7–13 Hz (ES1), Theta 4–7 Hz (ES2), Delta 0–4 Hz (ES3), Gamma 30–100 Hz (ES4)**; beta (13–30 Hz) is intentionally excluded except in the Element tier.
- Carrier palette across products draws on "popular" tuning frequencies: **528 Hz, 432 Hz, 444 Hz, and the nine Solfeggio tones**; Deepereum offers 29–30 carrier profiles (most-played: 528, 417, 639 Hz); the Element tier allows any carrier from 0–20,000 Hz to two decimals and up to 12 simultaneous layers.
- **Track lengths:** Classic 23–24 min; Deepereum 10/20/30 min; Element 12–60 min in 6-min increments. Recommended daily session 20–30 min; brainwaves take ~5–10 min to respond.
- **Classic structure/progression:** always **Alpha → Theta → Delta**; the current edition is 18 tracks × 3 days ≈ 60 days (earlier editions used 9 tracks × 6 days or 27 tracks × 2 days).
- **Multi-layering ("Synergistic MultiLayering"):** EquiSync harmonically stacks isochronic tones, monaural beats, and binaural beats on one track, beneath a prominent ambient/nature soundscape, with each entrainment layer at a different fractional volume. A "SynchroWave Modulation" feature oscillates the background-music volume in sync with the carrier (faster for alpha, slower for delta). "Vertical Modulation" makes a binaural waveform resemble a monaural beat while keeping the L/R Hz difference; "Horizontal Modulation" oscillates volume ear-to-ear like a bilateral beat.

**The one published Hz-with-pattern example** (an *illustrative* Element track, not a spec for any program level) shows how they think about progression "shapes": Layer 1 carrier 741→528 Hz (V-Shape), beat 8→4 Hz (U-Shape), 90–98% volume; Layer 2 carrier 444→222 Hz (Step-Shape), beat 12→10 Hz (Z-Shape), 52–59% volume; Layer 3 carrier 174→144 Hz, beat 42→35 Hz gamma (inverse patterns), 29–38% volume. EquiSync names four progression "shapes" — **Step, V, U, and Z** (plus inverse variants) — each repeated over a number of "legs," with linear or wave-like transitions. This is the most explicit articulation of *progression-pattern design* among the commercial products, even though the actual per-program numbers are withheld.

### iAwake Technologies (Profound Meditation Program) — layered "iNET," carriers as a therapy
iAwake's flagship Profound Meditation Program (PMP 3.0), designed by Eric Thompson, layers many methods it calls "iNET": Exhaustive Binaural Encoding, Dual Pulse Binaural Signals, Harmonic Layering, Isochronic Entrainment, Temporal Entrainment, plus "Carrier Frequency Therapy" and (unfalsifiable, pseudoscientific) "Biofield Entrainment." iAwake does not publish specific Hz values.
- **Progression by intensity, not just frequency:** the program ships in three "Tiers" (1–3) that "differ only in terms of the carrier frequencies and biofield amplitude they use" — higher tiers = stronger carrier "push." Users are told to step *down* to gentler "Releasing Tracks" if they experience "overwhelm."
- Specialized tracks target **Gamma, HyperGamma, and Epsilon** (sub-0.5 Hz) states. Total program ~430 minutes across 19 tracks; individual sessions ~20 min.
- **Design lesson for builders:** iAwake's explicit "adjust intensity if overwhelmed" model is a useful UX pattern (a strength/amplitude slider), even setting aside the "biofield" marketing claims, which have no scientific basis.

### Brain.fm — deliberately *not* binaural beats
Brain.fm is worth including as a contrast: it **rejects binaural beats** in favor of "neural phase-locking" — amplitude modulation embedded *within* each stereo channel of functional music, which it argues (with some published support) produces stronger entrainment than the weak phantom beat of binaural stimulation. Its own EEG study reported significant modulation of beta-band activity (12–20 Hz) and 8 Hz frontal phase-locking. Brain.fm targets the same bands (delta for sleep, beta/gamma for focus) but via modulated music rather than dual-tone beats, and offers a user-adjustable "neural effect" intensity slider. **Lesson:** modulation-in-music and isochronic tones are alternative (headphone-optional) entrainment methods worth offering alongside classic binaural beats.

### BrainWave (Banzai Labs, iOS) — transparent app defaults
This popular app publishes concrete defaults useful for a builder:
- Default binaural carrier is **low-frequency** (~120 Hz); example: a 1 Hz beat = **121 Hz left / 120 Hz right**. An optional "mid carrier" of **~250 Hz** is provided (a 1 Hz beat = 221/220 Hz).
- Uses **multi-stage programs** that ramp/step across bands (e.g., "Espresso Shot" = high beta + gamma; "Morning Meditation" = alpha + theta; "Focused and Alert" targets **40 Hz gamma**, the setting Andrew Huberman recommended).
- Offers pure single-frequency tones (20 preset frequencies), and background layering with music/nature sounds/white/brown noise.

### Mind Alive (DAVID Delight devices) — audio-visual, with published gamma protocols
Mind Alive's DAVID devices use **audio-visual entrainment (AVE)** — synchronized light flashes + pulsed tones (isochronic, monaural, and binaural) — plus optional cranio-electro stimulation. Sessions are preset across categories (Energize, Meditate, Brain Booster, Sleep, Feeling Better). Published gamma protocols: SMR/Gamma cycling between 40 Hz and 12–15 Hz SMR; "Randomized Gamma" between 38–42 Hz; and a fixed 40 Hz session. A **proprietary randomization** of the stimulus is used to encourage "dissociation" and better frequency-tracking. Mind Alive's own research page cites a controlled study using a 7 Hz beat at carriers of 133 Hz (L) / 140 Hz (R).

### Neuro-Programmer / Mind WorkStation (Transparent Corp) — the power-user toolkit
Transparent Corporation's software is a **session editor** rather than a fixed program: users combine binaural, monaural, and isochronic tones, noise, and background sounds, set frequencies and durations per segment, layer affirmations, and even drive external light/sound hardware. Sessions are typically built as **stepped segments** (a "descent" or "ascent" through bands). Notably, its research director engaged skeptic Steven Novella directly, conceding peer-reviewed evidence is "hard to locate." **Lesson for builders:** a segment/timeline editor (set band, duration, transition per step) is the most flexible session model.

### Open-source tools (SBaGen, Gnaural) — the builder's direct references
These are the most directly useful precedents for an open-source app:
- **SBaGen** (Jim Peters) uses `carrier+beat` notation, ships pink noise and river-sound backgrounds for masking, recommends stereo (not joint-stereo) MP3 encoding to preserve the beat, and includes the reverse-engineered Monroe Focus Level tone-sets as examples. Peters recommends mixing beats *just above* background noise level.
- **Gnaural** documents sensible defaults explicitly: it recommends carriers (it calls "Base Freq") **between ~110 and 300 Hz**, and its **default schedule constantly varies the base/carrier frequency** over the session "so that you never have one frequency playing in your ear for an extended time" — both to be gentle on hearing and to reinforce the psychological sense of "descent."

### What the peer-reviewed literature suggests for defaults
- Research studies most commonly use carriers of **240–500 Hz**; positive-result studies clustered at **220–255 Hz** (e.g., 230/220.45 Hz, 240/255 Hz). 440 Hz is perceptually optimal but "too high for comfortable listening."
- The 2025 parametric study is **Melnichuk et al., *Scientific Reports* 15:4308 (2025), "A parametric investigation of binaural beats for brain entrainment and enhancing sustained attention"** — a 2 (beat: beta or gamma) × 2 (carrier: 340 or 400 Hz) × 2 (onset: before or with task) × 2 (masking noise: present or absent) factorial design in 80 undergraduates. Entrainment was real, but the **headline finding was that gamma beats with a 340 Hz carrier plus white-noise masking improved attention** — the benefit appeared only in specific parameter combinations, and the wrong combination nulled or reversed the effect.
- The positive-cognition evidence comes from **Garcia-Argibay, Santed & Reales, *Psychological Research* 83:357–372 (2019)**, a meta-analysis of 22 studies (35 effect sizes) that found *"an overall medium, significant, consistent effect size (g = 0.45),"* also reporting that pre-task exposure outperforms during-task exposure and that white/pink-noise masking was not strictly necessary for the cognitive effect.
- Session length: meta-analytic and review evidence favors **≥15–30 minute** exposures; sessions <10 min more often show null effects.
- **Sobering caveat:** the skeptical benchmark is **Ingendoh, Posny & Heine, *PLOS ONE* 18(5):e0286023 (19 May 2023)**, a systematic review of 14 EEG studies that found *"five studies reporting results in line with the brainwave entrainment hypothesis, eight studies reporting contradictory, and one mixed results,"* concluding *"the research question cannot be settled at this point."* A separate 2023 *Scientific Reports* study found generic home-use beats slightly *worsened* a complex learning task. The science is genuinely unsettled.

## Details: Cross-Product Comparison Table (design parameters)

| Product | Carrier range | Carrier progression | Beat range / bands | Beat progression | Session length | Layering |
|---|---|---|---|---|---|---|
| **Holosync** | ~30–150 Hz (very low); measured 57–145 Hz | Drops ~10 Hz/level over 13 levels (claimed); to ~6–30 Hz at deepest | 0.2–20 Hz; targets delta | Drifts ~1 Hz/min down to ~2 Hz, then holds | 30 min (Dive) + 30 min (Immersion); 60–90 min/day | Rain + crystal bowls; subliminals later |
| **Hemi-Sync** | ~50–900 Hz (wide, multi-tone stacks) | Changes tone-stack per Focus Level | 0.75–16 Hz; delta→beta | Stepwise between Focus Levels | Varies; guided | Pink noise, surf, music, voice; multiplexed beats |
| **EquiSync** | Undisclosed; palette 174–741 Hz (Solfeggio/432/528) | Alpha→Theta→Delta across programs | Alpha 7–13, Theta 4–7, Delta 0–4, Gamma 30–100 | "Step/V/U/Z" shapes over "legs" | 23–24 min (Classic); up to 60 min (Element) | Isochronic+monaural+binaural under nature audio |
| **iAwake PMP** | Undisclosed | 3 Tiers by carrier intensity/amplitude | Theta/delta + Gamma/HyperGamma/Epsilon | Step down to "Releasing" if overwhelmed | ~20 min; ~430 min total | "iNET" multi-method + biofield (pseudoscience) |
| **Brain.fm** | N/A (not binaural) | N/A | Targets delta / beta 12–20 / gamma | Adaptive; modulation in music | Continuous | Modulation embedded in functional music |
| **BrainWave app** | 120 Hz default; 250 Hz option | Multi-stage ramps between bands | Full range incl. 40 Hz gamma | Stepped multi-stage | User-set + alarms | Music/nature/white/brown noise |
| **Mind Alive DAVID** | Audio + light | Preset sessions; randomized | Delta→gamma; 38–42 Hz gamma | Randomized + ramps | Preset (~20–40 min) | AVE (light+sound) + CES |
| **SBaGen/Gnaural** | 110–300 Hz recommended | Gnaural varies carrier constantly by default | User-defined | User-defined; Gnaural drifts | User-defined | Pink noise / river / user audio |

## Recommendations (for your open-source binaural beat web app)

**Stage 1 — sensible defaults (ship these):**
1. **Default carrier: 200 Hz**, user-adjustable ~100–400 Hz. This sits near Oster's effective range, matches positive-result research (220–255 Hz), and is comfortable. Offer a "deep/low carrier" mode (~120 Hz, à la BrainWave/Holosync) and note the tradeoff (Holosync-style low carriers are felt more than heard but are non-standard).
2. **Cap the beat frequency at ≤30 Hz per tone pair.** To target gamma (40 Hz), either accept degraded binaural perception or offer **isochronic tones / monaural beats** as an alternative method (as EquiSync, BrainWave, and Mind Alive do) — these entrain gamma better and work without headphones.
3. **Band presets:** delta 2 Hz (sleep), theta 6 Hz (meditation), alpha 10 Hz (relax/flow), beta 18 Hz (focus), gamma 40 Hz (alertness, via isochronic).
4. **Default session: 20–30 minutes.** Structure it as: **ramp** (waking band → target band over ~5–10 min) → **hold** at target → optional gentle **ramp up** at the end to avoid grogginess.

**Stage 2 — progression/drift patterns (differentiators):**
5. Implement a **"drift/descent" engine** modeled on Holosync/Gnaural: let users set start beat, end beat, and a rate (Holosync uses ~1 Hz/min; a stepped descent every 2–3 min is authentic). Offer both **continuous** and **stepped/plateau** modes.
6. Borrow EquiSync's **progression "shapes"** as a UX concept: Down-and-hold (U/V-shape), stepped descent, and gentle-carrier-drift. Optionally slowly vary the carrier across the session (Gnaural's default) to reduce ear fatigue.
7. For a multi-session "program," emulate the **band-progression curriculum** (alpha → theta → delta across days/weeks) rather than changing carriers — carrier-lowering across levels (Holosync) is not well supported by evidence and mainly serves as a paid-progression gimmick.

**Stage 3 — layering & polish:**
8. **Offer background masking** (pink noise by default; also white/brown noise, rain, ambient music) mixed *above* the tones, with the beats **low in the mix** (Peters/Monroe both mix ~20 dB detail beneath, i.e., beats faint). Note the nuance: the 2025 Melnichuk study found white-noise masking *helped* in its best-performing gamma/340 Hz condition, whereas the 2019 Garcia-Argibay meta-analysis found masking not strictly necessary for the cognitive effect — so make masking a default-on but user-toggleable layer.
9. **Require/recommend stereo headphones** and, if exporting audio, use **full stereo (not joint-stereo) encoding** to preserve the beat (SBaGen's explicit warning).
10. Add an **intensity/volume slider** for the tone layer (iAwake's "step down if overwhelmed" model) and a **pre-task onset** option (start audio a few minutes before the user's task — both the 2019 meta-analysis and the 2025 study found pre-task onset more effective than during-task).

**Benchmarks that would change these defaults:** If you add EEG feedback (even consumer Muse/single-electrode grade), switch from fixed frequencies to **individualized/closed-loop** beats — the 2023–2025 literature strongly suggests fixed one-size-fits-all frequencies are the main reason effects are inconsistent. The real-time EEG-guided benchmark is **Kahathuduwa et al., *Physiologia* 5(4):44 (24 Oct 2025)**, a Texas Tech RCT of 25 adults using a consumer single-electrode (Fp1) headset: it drove **100% of users below 8 Hz (median 7.4 min) and 96% below 4 Hz (9.0 min)** across two 30-min sessions. If your telemetry shows users mostly run <10-minute sessions, lengthen the default hold phase, since short sessions dominate the null-result studies.

## Caveats
- **Most exact numbers for Holosync and Hemi-Sync are reverse-engineered by hobbyists, not company-published.** Holosync's per-level carrier figures come from forum posts and individual measurements that partly conflict (e.g., Awakening Level 4 measured at 57 vs 59 Hz). Hemi-Sync's Focus Level frequencies come from an anonymous USENET measurement document; the Monroe equipment was analog, so even the originals were imprecise. Treat these as *approximate design references*, not exact specs.
- **EquiSync and iAwake do not disclose their actual per-program frequencies at all.** The specific EquiSync Hz values quoted (741/528, 444/222, etc.) are from an *illustrative* Element example, not a program spec — do not treat them as EquiSync's real defaults.
- **"Biofield entrainment" (iAwake) and Solfeggio-frequency health claims (EquiSync) are pseudoscientific** and have no basis in physics or neuroscience; the audible carrier/beat mechanics are the only technically meaningful parts.
- **The efficacy of binaural beats themselves is scientifically unsettled** — the 2023 PLOS ONE systematic review found the entrainment hypothesis more often contradicted than supported, and one 2023 trial found a *negative* effect on learning. Brain.fm and Mind Alive both argue amplitude-modulation and audio-visual methods entrain more reliably than binaural beats. Build the tool as a relaxation/focus aid, and avoid making medical or guaranteed-cognitive claims.
- **Company session-length and progression claims (e.g., Holosync's ~7-year curriculum, "meditate like a Zen monk") are marketing**, not clinical findings; the underlying tone specs are more reliable than the outcome claims attached to them.