# grok-speaker

Server-side Bun client for Grok TTS, with Iris by default. Quality mode (`optimize_streaming_latency: 0`), the highest supported PCM sample rate and native playback speed are fixed rather than exposed as quality-reducing knobs.

```typescript
import GrokSpeaker from 'grok-speaker'

using speaker = new GrokSpeaker({key: Bun.env.XAI_API_KEY!})

await speaker.warmup()

for await (const event of speaker.stream({text: 'Abyssal Lantern.', modifier: 'loud'})) {
  if (event.type === 'audio') {
    // Send event.pcm to a player configured for event.sampleRate Hz, mono, signed 16-bit little-endian.
  } else if (event.type === 'timestamps') {
    console.log(event.timestamps)
  } else {
    console.log(event.traceId)
  }
}

const {wav, sampleRate, duration, timestamps} = await speaker.generate([
  {text: 'Quantum Moiré.', modifier: ['loud', 'sing-song']},
  {action: 'giggle'},
  'GPT-6 Astra.',
])
await Bun.write('review.wav', wav)
```

Do not expose API keys to a browser. Relay PCM and metadata from your server. This package does not play audio or encode Opus; convert the lossless WAV once when producing stored Opus assets.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `key` | required | API key for the selected provider |
| `provider` | `'auto'` | `'xai'`, `'openrouter'` or prefix-based inference |
| `voice` | `'iris'` | Grok voice ID |
| `language` | `'en'` | BCP-47 language code or `'auto'` |
| `textNormalization` | `false` | Provider preprocessing of numbers, abbreviations and symbols |
| `timeoutMs` | `120_000` | Maximum duration of each request/stream, including connection setup |
| `maxBufferedBytes` | `8_000_000` | Maximum queued PCM and estimated timestamp storage for an xAI stream |

Auto detection recognizes `xai-…` and `sk-or-…` prefixes with alphanumeric, underscore or hyphen suffixes. Unknown formats require an explicit provider; contradictory known prefixes are rejected. Credentials are never tried against another provider. `speaker.provider` exposes the resolved provider, not the key.

## Text

Every method accepts a string, speech/action object or readonly array of those segments. Adjacent segments are separated by one space. A modifier array is nested in order: `['loud', 'slow']` becomes `<loud><slow>…</slow></loud>`. An empty modifier array leaves the text unchanged.

- Modifiers: `soft`, `whisper`, `loud`, `build-intensity`, `decrease-intensity`, `higher-pitch`, `lower-pitch`, `slow`, `fast`, `sing-song`, `singing` and `emphasis`.
- Actions: `pause`, `long-pause`, `hum-tune`, `laugh`, `chuckle`, `giggle`, `cry`, `tsk`, `tongue-click`, `lip-smack`, `breath`, `inhale`, `exhale` and `sigh`. Actions serialize as `[action]`, not XML elements.

Strings retain native Grok markup verbatim, including inside speech objects. There is no implicit loud wrapper – use `modifier: 'loud'` explicitly so softer segments remain independently controllable. `serializeText(text)` is exported for inspecting the exact provider input. Empty input and input exceeding 15 000 UTF-16 code units after serialization are rejected before any request. Tags and separators count toward that limit and provider billing.

All text types (`Arrayable`, `Modifier`, `SpeakSegment`, `ActSegment`, `TextSegment` and `Text`) are exported.

## Streaming and generation

`stream(text, {signal?, timestamps?})` returns a lazy async generator. No synthesis request starts until iteration begins. Audio events contain sample-aligned `pcm: Uint8Array` and the actual `sampleRate`. The format is always mono signed 16-bit little-endian. Timestamp events contain `{char, start, end}[]`, with seconds as the time unit; the final `done` event carries a provider trace ID when available. Play audio immediately instead of waiting for alignment.

`generate(text, {signal?, timestamps?})` returns `{wav, sampleRate, duration, timestamps, traceId}`. It requests maximum-quality PCM over HTTP, then adds a RIFF/WAVE header without resampling or re-encoding. `duration` is calculated from the audio sample count. Timestamps default to enabled; disable them to avoid the buffered alignment pass.

### Direct xAI

`warmup()` establishes an authenticated reusable WebSocket without synthesizing or billing text. Concurrent warmups share the connection. Streaming requests 48 kHz PCM, Quality mode and character timestamps by default. Subsequent utterances reuse the socket. Changing the timestamp setting requires a new connection; warmup prepares the default timestamp-enabled connection. `generate()` uses HTTP separately and does not benefit from the streaming socket.

One stream may be active per speaker; overlapping streams fail rather than queue behind potentially long speech or mix utterances. Use separate instances for independent concurrent speakers. Idle connections closed by the server reconnect on the next call. Failed or canceled utterances are never automatically replayed.

The local smoke test on 2026-09-11 measured 527 ms and 360 ms from submission to first PCM on an already connected socket. Warmup itself took 474 ms. These are observations, not a ≤1000 ms guarantee, and exclude relay, playback buffering and device latency.

### OpenRouter

OpenRouter uses its HTTP speech endpoint and does not expose the native reusable xAI TTS socket. `warmup()` performs an authenticated, nonsynthesis `GET /api/v1/key`, consuming its response to establish HTTP keep-alive; it does not warm the voice model or return account data.

The package requests 48 kHz and Quality mode via xAI provider options, but OpenRouter currently returns **24 kHz** in live tests. It reports this truthfully rather than upsampling or labeling it 48 kHz. For maximum fidelity, use a direct xAI key.

OpenRouter streaming disables timestamps by default. Explicitly requesting streaming timestamps throws: the router’s timestamp envelope is buffered, not live PCM. Use `generate()` for alignment. Generation decodes that envelope even when its HTTP content type incorrectly says `audio/pcm`, inferring the actual sample rate from PCM length and provider duration. Raw streaming requires a declared mono PCM rate.

### Cancellation and lifecycle

Pass an `AbortSignal` to cancel an active call, including a pending `next()`. Breaking out of `for await` closes an unfinished xAI session or cancels the HTTP body. Slow xAI consumers exceeding the configured queue limit fail instead of buffering indefinitely. The queue is also limited to 4096 events. Fully buffered WAV generation is not subject to this queue limit.

Call `close()` when finished, or use `using` as above. Closing is terminal and idempotent, aborts active work and closes the socket. There are no automatic paid retries or provider fallbacks. Timestamp alignment is returned as supplied; it can include markup or approximately uniform timing and must not be treated as phoneme-accurate ground truth.

## Sources

- [xAI TTS, streaming, speech tags and formats](https://docs.x.ai/developers/model-capabilities/audio/text-to-speech)
- [OpenRouter TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts)
- [OpenRouter current-key endpoint](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key)

Run offline tests with `bun run test` from this package. Tests do not use real credentials or synthesize paid audio.
