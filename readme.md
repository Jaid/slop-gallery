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

## Knot narration

Knottingham uses `iris` from `x-ai/grok-voice-tts-1.0` through OpenRouter, with English selected explicitly and no character prompt or delivery tags. The preset is in `scripts/lib/knots/narrator.ts`. Gallery portrait narration keeps its separate narrator settings.

Run `bun scripts/announceKnots.ts --all --force` with `OPENROUTER_API_KEY` to rebuild the knot and model-name announcements. Lossless PCM sources are cached, then encoded once to mono Opus at 80 kb/s. Every selected clip must pass validation before any existing announcement is replaced. Failed requests need an explicit `--retry-failed`; successful sources are reused.

## Knot voice auditions

Run `bun scripts/auditionKnots.ts` with `OPENROUTER_API_KEY` to generate consistency auditions in `private/knot-voice-consistency`: Iris’s natural voice, ten historical Gemini characters and four historical `longanlingxin` character variations using Qwen Audio 3.0 TTS Plus. `longanlingxin` is a Qwen voice, not a Gemini voice.

Each character makes five independent, stateless TTS requests with the same voice and character direction: Abyssal Lantern, Kintsugi Dawn, Quantum Moiré, Porcelain Constellation and GPT-6 Astra. The five lossless recordings are stitched in that order with 500 ms of silence between them, then encoded once to Opus. No crossfade, gain normalization, pitch correction, shared conversation or audio reference hides differences between requests. The previous single-request auditions in `private/knot-voice-auditions` are not consistency tests.

Prompts and presets are in `scripts/lib/knots/voiceAuditions.ts`. Each character’s manifest preserves its five request bodies, generation IDs, source hashes and durations; the top-level manifest lists completed auditions. Source recordings are cached and paid requests are reserved to prevent accidental retries. To select characters, append their IDs to the command. After inspecting a failed/interrupted attempt, pass `--retry-failed` to explicitly authorize another request; successful clips are reused and prior request reservations are preserved.

Run `bun scripts/auditionKnots.ts 15-grok-iris` for only the selected Iris voice. It uses the same five independent calls and untouched delivery as the other consistency tests.

### Iris quality review

For a direct Grok comparison with/without `<loud>`, run `bun scripts/auditionIrisQuality.ts --compare-loud`. This preserves the existing loud preview and generates `private/iris-quality/xai-quality.opus` with otherwise identical settings and five independent calls.

`bun scripts/auditionIrisQuality.ts` compares direct Grok with OpenRouter using `<loud>`, quality-first latency, 48 kHz PCM requests and character timestamps, with text normalization on/off. Each preview still uses five independent calls. `bun scripts/benchmarkIrisLatency.ts` measures direct WebSocket startup with timestamps on/off and new/reused connections. Both are offline review tools; neither changes the approved narrator preset or game assets. See [the measured results and caveats](docs/iris-quality-review.md).
