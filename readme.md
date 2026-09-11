# Slop Gallery

[slop.gallery](https://slop.gallery)

[knot.slop.gallery](https://knot.slop.gallery)

## Controls

- E: Interact – listen to the portrait or knot under the crosshair. Explicit knot requests replay the title even if it was already announced.
- Z: Hold to zoom; release to restore the FOV.
- V: Hold to inspect. Knot inspections still announce previously unheard knots.
- X: Dump the player, camera and aimed surfaces to the console and VictoriaLogs when telemetry is enabled.
- Left mouse: Hold to grab, release to place. Right mouse or Q throws the held object. Right-click no longer starts narration.

`bun test` skips the browser interaction suite unless `LIVE_TEST=true` is explicitly set. `bun run test` runs unit tests only; run each subpackage’s test script for its isolated suite. Gameplay interaction testing is manual in the existing browser.

## Knot voice auditions

Run `bun scripts/auditionKnots.ts` with `OPENROUTER_API_KEY` to generate consistency auditions in `private/knot-voice-consistency`: ten Gemini characters and four `longanlingxin` character variations using Qwen Audio 3.0 TTS Plus. `longanlingxin` is a Qwen voice, not a Gemini voice.

Each character makes five independent, stateless TTS requests with the same voice and character direction: Abyssal Lantern, Kintsugi Dawn, Quantum Moiré, Porcelain Constellation and GPT-6 Astra. The five lossless recordings are stitched in that order with 500 ms of silence between them, then encoded once to Opus. No crossfade, gain normalization, pitch correction, shared conversation or audio reference hides differences between requests. The previous single-request auditions in `private/knot-voice-auditions` are not consistency tests.

Prompts and presets are in `scripts/lib/knots/voiceAuditions.ts`. Each character’s manifest preserves its five request bodies, generation IDs, source hashes and durations; the top-level manifest lists completed auditions. Source recordings are cached and paid requests are reserved to prevent accidental retries. To select characters, append their IDs to the command. After inspecting a failed/interrupted attempt, pass `--retry-failed` to explicitly authorize another request; successful clips are reused and prior request reservations are preserved.

Existing game narration is unchanged until a character is selected.
