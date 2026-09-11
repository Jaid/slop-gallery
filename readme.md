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

Run `bun scripts/auditionKnots.ts` with `OPENROUTER_API_KEY` to generate ten character auditions in `private/knot-voice-auditions`. Each Opus contains Abyssal Lantern, Kintsugi Dawn, Quantum Moiré, Porcelain Constellation and GPT-6 Astra. The prompts and voice presets are in `scripts/lib/knots/voiceAuditions.ts`; the output manifest preserves the exact generation requests. Recordings are cached and paid requests are reserved to prevent accidental retries. After a failed/interrupted request, inspect the cache before explicitly removing its reservation to retry.

Existing game narration is unchanged until a character is selected.
