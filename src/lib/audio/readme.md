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

All seven are part of the catalog in `soundEffects.ts`, next to the 14 interface effects. The held zoom layer’s recipe lasts a finite 1.2 seconds; gameplay holds it until released. New cues never renumber existing catalog IDs.

Zoom sweeps follow `ego-player`'s actual FOV transition direction and duration. Extended transitions use the extended family, including direct returns to normal FOV. Instant transitions produce no sweep. Reversing replaces the previous sweep with a short fade instead of stacking sounds. Explicit camera handoff, teleport and unmount release zoom audio without fabricating another transition.

`onZoomChange` continues driving the app's visual effects independently of sound settings. It also controls the quiet held-zoom layer's gain; extended zoom makes that layer slightly stronger. There is one sustained playback per zoom session, not a source allocated every frame.

## Movement

The player adapter resolves a ground modifier and passes collision-resolved horizontal speed and crouch state to `SoundEngine.step(surface, speed, crouching)`. All four modifiers retain the **Soft Weight** family—a short body impact, one filtered contact layer and a quiet delayed weight cue—while shifting its material character. `generic` is the default hard surface; `hollow` covers the wooden areas; `glass` applies to the walkable lobby floor window near spawn; `fabric` applies to the Sienna carpet and Moonfall crater terrain. Visible carpet bounds are shared with the Sienna renderer, and the crater uses the same configured radius as its terrain geometry. Actual speed continuously changes level, pitch, brightness and duration; per-stride pitch variation remains intentionally subtle to avoid listening fatigue. Crouching lowers level and brightness further. The stride callback controls cadence without a separate fixed footstep cooldown.

Renewed ground contact uses the exact same **Soft Weight** footstep recipe rather than a separate landing sound. Horizontal physical speed and crouch state keep the ordinary footstep timbre, while `ego-player`'s downward speed immediately before collision resolution drives a strong 2.5×–12× volume factor. Strength follows impact energy (fall speed squared), so ordinary hops stay restrained while large drops become disproportionately heavier. The factor saturates at 12 world units/second to preserve headroom. Initial placement and teleport settling are silent, as are contact interruptions shorter than 0.06 seconds. A landing suppresses a duplicate stride footfall for 0.1 seconds, then ordinary strides resume.

The reusable `ego-player` package emits `onLand` and `onZoomTransition` but contains no sound engine or gallery imports. `playerAudio.ts` owns surface selection, active-input policy, mute/lock gating and shared portrait/knot inspection state observation. Pause, blur, pointer-lock loss, mute and unmount stop held/transition audio even without another rendered frame. Narration uses the shared controller in `narration.ts` (`use-narrator` / `use-audio-queue`), with a separate output path from procedural player effects. Its meter retains paused connections for injection/resume and keys each explicitly concurrent voice separately, so overlapping `async` narration gets independent stacked HUD indicators and independent spectra.

## Narration subtitles

`#component/NarrationSubtitles` shows the foreground narration’s text while its audio plays, in place of the artwork overlay, which would only repeat the same title and description. It shows one sentence at a time, or a run of short ones together (`subtitleGroups` in `subtitles.ts`, up to 56 characters), each coming up 0.2 s before its first word is spoken. Spoken words turn yellow, and the current word rises by 0.15 em through `translate`, which moves nothing else, staying up for 300 ms after it is spoken before it drops back (scaling it made it overlap its neighbors, and Geologica has no width-neutral grade axis for bolder strokes). Every letter turns yellow as it is spoken (`letterStarts`): at its own time where the timing has character spans, otherwise spread evenly over its word’s duration (an eased spread, quick at the word’s ends and slow in its middle, was tried and dropped). One path for every timing keeps each glyph drawn exactly once; a yellow copy laid over the white word, as an earlier fill did, let the white glyphs’ subpixel edges show around it. Native browser speech only reports which word it reached, so its current word turns yellow as a whole. The component reads `narrator.progress()` every animation frame and paints the words directly, so React only renders when the sentence changes.

Timings come from three places:

- Generated narrations (`PortraitNarration`) go through `NarrationAligner` right after the TTS: OpenRouter’s `/audio/transcriptions` with word timestamps (`?stt_model`, `x-ai/grok-stt-1.0` by default, the most exact in hive’s 2026-11-01 comparison of 29 systems), mapped onto the text by `timingFromWords`. It runs inside the speech cache, so eager generation and replays get it for free; it gives up after 8 s, and a failed alignment plays the audio anyway.
- Bundled narrations carry letter timings measured offline by Meta’s MMS forced aligner: `bun scripts/alignNarrations.ts` (needs ffmpeg and uv; `scripts/lib/mmsAlign.py` brings its own CPU-only Torch) writes `src/worlds/gallery/narrationTimings.json`. Rerun it when a bundled narration or its text changes; `test/unit/narration-timings.test.ts` notices stale entries.
- Audio without a timing, including every generated narration under `?stt_model=false`, is paced by `estimateTiming` over its duration.

## Ambience

Ambient sounds are emitters: subclasses of `ambience/base/AmbienceEmitter.ts` that declare looping filtered noise beds with smoothly swaying levels and scatter one-shots (`chirp`, `burst`) over each lookahead window with `scatter`, a memoryless Poisson process. Constructing one is silent; `start()` builds its graph on `SoundEngine`’s effects master (so mute covers it), heard through an HRTF panner at its position, at full level within `hearing.near` and fading linearly to silence at `hearing.far`, and disabled (faded to silence) while the listener is outside its `rooms`.

World components sound an emitter with `useAmbienceEmitter(EmitterClass, rooms)`, which adds it to `useAmbienceEmitters`. An emitter’s id is the global id of its room’s ambience entry, and the gallery’s components take its `rooms` from `world.ambienceRooms`: its own room and every room whose `audibleAmbiences` in `worlds/gallery/relations.ts` lists it. `AmbienceListener` (in `Scene`) moves the Web Audio listener with the camera, tells emitters the listener’s room and starts them once the sound engine exists after the first click. `?show_ambience_emitters` draws a ball at each emitter, white at full strength at the camera, light gray when silent and blue (1%) to red (99%) in between, crossed out while disabled.

`ambience/Fountain.ts` is the Lobby fountain’s quiet trickle: a soft hiss plus rising-pitch bubbles and small splashes, audible within 21 m. `ambience/LodgeFire.ts` is the Lodge fire burning low: a steeply filtered roar (`stages` chains identical filters, 12 dB per octave each) under sparse fine crackles, audible within 14 m. `ambience/MoonfallOrbit.ts` gives the orbital sculpture a celestial hum: held tones (`ToneBed`, each optionally doubled a little higher to beat) over a faint rumble, audible within 32 m.

Moods (`src/lib/moods`) sound a centered `AmbienceLoop` from `ambience/moods` while they hold, at the mood’s strength. `FusionAmbience.ts` holds while any fusion’s portal is open, kept faint, since the portal brings its own strong sound and the mood only reminds a player far away of it: a transformer hum of the mains and its overtone, static snapping on and on in single bright clicks whose density wanders slowly, and now and then a spark arcing with a short buzz under a fizz.

## Fusions

`FusionSound.ts` is the sound of a fusion’s portal, heard through an HRTF panner at the portal on the effects master (so the mute covers it, and `AmbienceListener` moves the Web Audio listener even in worlds without ambience). It opens with the intro’s own sound (`intro.ts` in `src/lib/gallery/fusion` holds its moments): a pinprick of glass, an inhale rising over a pressure drop while the work rattles and is dragged in, a crack, a boom and a gong when the singularity bursts, a swarm of glints while the motes stream back in, the ember’s heartbeat, whose first two beats yank the satellites in with a whoosh and whose third ignites the portal with a short roar and a chord, and the portal’s slingshot: the zip of its tethers lashing out to both, a whir climbing to a howl under whooshes passing ever faster while it whirls them around, a snap and a twang as it lets go, a rush as the ring of fire they left falls in and a boom, a blast of air, a bright chord and glitter as it lands. While the portal brews, three beds run: a hum of a low fifth and its octaves through a resonant lowpass, which swells with the portal’s energy and climbs with its vortex, a shimmer trembling seven times a second and a whoosh that swells whenever a satellite passes. Every image that surfaces rings a bell with a slow vibrato, one step further along a rising motif each time. The climax rises over its whole length, the result flips out on a boom, a blast of air, a fanfare of bells and a spray of glitter while the hum breaks off, and a failure falls and sputters with a dull pop while the hum sinks an octave. Everything rings in a short, bright, synthetic reverb. `FusionPortal`’s `PortalShow` cues it from the fusion’s timeline and feeds it the portal’s envelope every frame; it only starts while the portal still brews and the sound is on.

`ghostChorus.ts` is the sound of the ghosts the Spook Orb lets escape a successful fusion’s portal (`src/lib/gallery/fusion/effects/ghosts`): every ghost wails as it escapes, two detuned sawtooths and a breath sung through a two-formant “oo” that opens toward “ah” at the height of its glide and closes again, with a widening tremble, over a beating tritone, a theremin’s quavering glide and a cold draft rising with them, all in a dark 3.5 s hall. Its HRTF panner rises 2 m with the ghosts over their flight, which the beds last as long as. The ghosts’ `EffectShow` plays it once, as the result flips out, when the portal hands it an output (sound on); it cleans up after itself, so the portal closing doesn’t cut its tail off. Rendered offline 4 m in front of the portal, it peaks at 0.37 and its loudest half second (0.088 RMS) about matches the portal’s own boom (0.094).

## Playback ownership

`playVoices()` returns a cancellable playback with a gain parameter. It owns only its sources, filters, envelopes and local bus; it never disconnects the caller's master or closes the caller's context. Both natural completion and cancellation disconnect nodes. Voice envelopes start with intrinsic gain zero, including before delayed onsets, so sample-boundary rounding cannot leak a full-volume noise sample.

## Validation

Run `bun test ./test/unit/sound-engine.test.ts ./test/unit/sound-effects.test.ts ./test/unit/player-audio.test.ts` and `bun run --cwd packages/ego-player test`.

`bun test/browser/run.ts fusionSound.ts` renders a fusion that succeeds after the image model took 6.5 s and one that fails after 1 s offline, driven by the portal’s own envelope every 50 ms, heard from 4 m away, and checks for silence, headroom and a silent tail; called with `{listen: true}`, it also returns both as WAVs.

With the usual development server and existing debug browser running, `bun test/browser/run.ts playerAudio.ts` renders silent offline buffers. It checks all seven cues, speed/crouch/impact-dependent output, headroom, silent tails, held-zoom cancellation and mid-transition reversal. It does not play audio, simulate input, navigate, focus or resize the user's browser. `soundEffectCatalog.ts` is a standalone fixture that renders every catalog recipe the same way and checks for silence, headroom and silent tails. This checks synthesis and lifecycle behavior, not subjective in-game loudness or timbre.
