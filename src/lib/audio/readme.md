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

All seven are part of the catalog in `soundEffects.ts`, next to the 13 interface effects. The held zoom layer’s recipe lasts a finite 1.2 seconds; gameplay holds it until released. New cues never renumber existing catalog IDs.

Zoom sweeps follow `ego-player`'s actual FOV transition direction and duration. Extended transitions use the extended family, including direct returns to normal FOV. Instant transitions produce no sweep. Reversing replaces the previous sweep with a short fade instead of stacking sounds. Explicit camera handoff, teleport and unmount release zoom audio without fabricating another transition.

`onZoomChange` continues driving the app's visual effects independently of sound settings. It also controls the quiet held-zoom layer's gain; extended zoom makes that layer slightly stronger. There is one sustained playback per zoom session, not a source allocated every frame.

## Movement

The player adapter resolves a ground modifier and passes collision-resolved horizontal speed and crouch state to `SoundEngine.step(surface, speed, crouching)`. All four modifiers retain the **Soft Weight** family—a short body impact, one filtered contact layer and a quiet delayed weight cue—while shifting its material character. `generic` is the default hard surface; `hollow` replaces the old wood boolean and covers the same wooden areas; `glass` applies to the walkable lobby floor window near spawn; `fabric` applies to the Sienna carpet and Moonfall crater terrain. Visible carpet bounds are shared with the Sienna renderer, and the crater uses the same configured radius as its terrain geometry. Actual speed continuously changes level, pitch, brightness and duration; per-stride pitch variation remains intentionally subtle to avoid listening fatigue. Crouching lowers level and brightness further. The stride callback controls cadence without a separate fixed footstep cooldown.

Renewed ground contact uses the exact same **Soft Weight** footstep recipe rather than a separate landing sound. Horizontal physical speed and crouch state keep the ordinary footstep timbre, while `ego-player`'s downward speed immediately before collision resolution drives a strong 2.5×–12× volume factor. Strength follows impact energy (fall speed squared), so ordinary hops stay restrained while large drops become disproportionately heavier. The factor saturates at 12 world units/second to preserve headroom. Initial placement and teleport settling are silent, as are contact interruptions shorter than 0.06 seconds. A landing suppresses a duplicate stride footfall for 0.1 seconds, then ordinary strides resume.

The reusable `ego-player` package emits `onLand` and `onZoomTransition` but contains no sound engine or gallery imports. `playerAudio.ts` owns surface selection, active-input policy, mute/lock gating and shared portrait/knot inspection state observation. Pause, blur, pointer-lock loss, mute and unmount stop held/transition audio even without another rendered frame. Narration uses the shared controller in `narration.ts` (`use-narrator` / `use-audio-queue`), with a separate output path from procedural player effects. Its meter retains paused connections for injection/resume and keys each explicitly concurrent voice separately, so overlapping `async` narration gets independent stacked HUD indicators and independent spectra.

## Ambience

Ambient sounds are emitters: subclasses of `ambience/base/AmbienceEmitter.ts` that declare looping filtered noise beds with smoothly swaying levels and scatter one-shots (`chirp`, `burst`) over each lookahead window with `scatter`, a memoryless Poisson process. Constructing one is silent; `start()` builds its graph on `SoundEngine`’s effects master (so mute covers it), heard through an HRTF panner at its position, at full level within `hearing.near` and fading linearly to silence at `hearing.far`, and disabled (faded to silence) while the listener is outside its `rooms`.

Level components sound an emitter with `useAmbienceEmitter(EmitterClass)`, which adds it to `useAmbienceEmitters`. `AmbienceListener` (in `Scene`) moves the Web Audio listener with the camera, tells emitters the listener’s room and starts them once the sound engine exists after the first click. `?show_ambience_emitters` draws a ball at each emitter, white at full strength at the camera, light gray when silent and blue (1%) to red (99%) in between, crossed out while disabled.

`ambience/Fountain.ts` is the Lobby fountain’s quiet trickle: a soft hiss plus rising-pitch bubbles and small splashes, audible within 21 m. `ambience/LodgeFire.ts` is the Lodge fire burning low: a steeply filtered roar (`stages` chains identical filters, 12 dB per octave each) under sparse fine crackles, audible within 14 m. `ambience/MoonfallOrbit.ts` gives the orbital sculpture a celestial hum: held tones (`ToneBed`, each optionally doubled a little higher to beat) over a faint rumble, audible within 32 m.

## Playback ownership

`playVoices()` returns a cancellable playback with a gain parameter. It owns only its sources, filters, envelopes and local bus; it never disconnects the caller's master or closes the caller's context. Both natural completion and cancellation disconnect nodes. Voice envelopes start with intrinsic gain zero, including before delayed onsets, so sample-boundary rounding cannot leak a full-volume noise sample.

## Validation

Run `bun test ./test/unit/sound-engine.test.ts ./test/unit/sound-effects.test.ts ./test/unit/player-audio.test.ts` and `bun run --cwd packages/ego-player test`.

With the usual development server and existing debug browser running, `bun test/browser/run.ts playerAudio.ts` renders silent offline buffers. It checks all seven cues, speed/crouch/impact-dependent output, headroom, silent tails, held-zoom cancellation and mid-transition reversal. It does not play audio, simulate input, navigate, focus or resize the user's browser. `soundEffectCatalog.ts` is a standalone fixture that renders every catalog recipe the same way and checks for silence, headroom and silent tails. This checks synthesis and lifecycle behavior, not subjective in-game loudness or timbre.
