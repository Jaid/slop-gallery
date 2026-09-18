# Procedural player audio

Player effects use Web Audio synthesis only: no recordings, downloads, generated assets or additional dependencies. `proceduralAudio.ts` owns the shared oscillator/noise renderer; `playerSoundEffects.ts` owns the recipes. The same graph can render into an `OfflineAudioContext` for regression tests.

## Cues

| Catalog ID | Cue | Gameplay trigger |
| --- | --- | --- |
| SFX-31 | Zoom Forward | Normal field of view moves toward casual zoom. |
| SFX-32 | Extended Zoom Forward | Field of view moves toward extended zoom. |
| SFX-33 | Zoom Retract | Casual zoom retracts. |
| SFX-34 | Extended Zoom Retract | Extended zoom retracts, including its automatic return to casual while moving. |
| SFX-35 | Viewing Mode Enter | Portrait or Knottingham V-inspection begins or resumes. |
| SFX-36 | Viewing Mode Leave | V-inspection is released, including target removal. |
| SFX-37 | Zoom Focus | A quiet two-tone layer sustained while zoomed. |
| SFX-38 | Ground Contact | Renewed ground contact after a jump or fall. |

All eight appear on the soundboard's enabled wall after the previously selected effects. The held zoom layer has a finite 1.2-second soundboard audition; gameplay holds it until released. New cues do not change the previous catalog IDs or audition selection order.

Zoom sweeps follow `ego-player`'s actual FOV transition direction and duration. Extended transitions use the extended family, including direct returns to normal FOV. Instant transitions produce no sweep. Reversing replaces the previous sweep with a short fade instead of stacking sounds. Explicit camera handoff, teleport and unmount release zoom audio without fabricating another transition.

`onZoomChange` continues driving the app's visual effects independently of sound settings. It also controls the quiet held-zoom layer's gain; extended zoom makes that layer slightly stronger. There is one sustained playback per zoom session, not a source allocated every frame.

## Movement

The player adapter passes collision-resolved horizontal speed and crouch state to `SoundEngine.step(wood, speed, crouching)`. Footsteps currently have five audition candidates: **Soft Sole**, **Heel / Toe**, **Brushed Sole**, **Rubber Flex**, and **Dusty Floor**. Pressing **K** cycles the active candidate and shows its number/name in the notice UI; the first candidate is active after startup. Every candidate still responds continuously to actual speed, surface, crouching and per-stride variation. Crouching lowers level and brightness across all five, while wooden and hard floors retain distinct voicing. The stride callback controls cadence without a separate fixed footstep cooldown.

Landing sounds use `ego-player`'s downward speed immediately before collision resolution, not the nearly zero post-impact vertical velocity. Larger impacts are heavier, with a bounded maximum. Initial placement and teleport settling are silent, as are contact interruptions shorter than 0.06 seconds. A landing suppresses a duplicate footfall for 0.1 seconds, then ordinary strides resume.

The reusable `ego-player` package emits `onLand` and `onZoomTransition` but contains no sound engine or gallery imports. `playerAudio.ts` owns surface selection, active-input policy, mute/lock gating and shared portrait/knot inspection state observation. Pause, blur, pointer-lock loss, mute and unmount stop held/transition audio even without another rendered frame. Narration uses the shared controller in `narration.ts` (`use-narrator` / `use-audio-queue`), with a separate output path from procedural player effects. Its meter retains paused connections for injection/resume and keys each explicitly concurrent voice separately, so overlapping `async` narration gets independent stacked HUD indicators and independent spectra.

## Playback ownership

`playVoices()` returns a cancellable playback with a gain parameter. It owns only its sources, filters, envelopes and local bus; it never disconnects the caller's master or closes the caller's context. Both natural completion and cancellation disconnect nodes. Voice envelopes start with intrinsic gain zero, including before delayed onsets, so sample-boundary rounding cannot leak a full-volume noise sample.

## Validation

Run `bun test ./test/unit/sound-engine.test.ts ./test/unit/sound-effects.test.ts ./test/unit/player-audio.test.ts ./test/unit/soundboard-layout.test.ts` and `bun run --cwd packages/ego-player test`.

With the usual development server and existing debug browser running, `bun test/browser/run.ts playerAudio.ts` renders silent offline buffers. It checks all eight cues, speed/crouch/impact-dependent output, headroom, silent tails, held-zoom cancellation and mid-transition reversal. It does not play audio, simulate input, navigate, focus or resize the user's browser. This checks synthesis and lifecycle behavior, not subjective in-game loudness or timbre.
