# Iris quality and latency review

2026-09-11. Review only – the approved narrator preset and all in-game recordings are unchanged.

## Review files

Each file contains five independent REST generations: Abyssal Lantern, Kintsugi Dawn, Quantum Moiré, Porcelain Constellation and GPT-6 Astra. Takes are separated by 500 ms of silence. There is no gain normalization, crossfade, pitch correction or reused conversation.

| File in `private/iris-quality` | Route | Text normalization | Actual PCM rate | Duration |
| --- | --- | --- | --- | --- |
| `xai-loud-quality.opus` | Direct Grok | Off | 48 kHz | 10.91 s |
| `xai-loud-quality-normalized.opus` | Direct Grok | On | 48 kHz | 10.51 s |
| `openrouter-loud-quality.opus` | OpenRouter | Off | 24 kHz | 10.99 s |
| `openrouter-loud-quality-normalized.opus` | OpenRouter | On | 24 kHz | 11.225 s |

Every generation requests Iris, English, `<loud>…</loud>`, PCM at 48 kHz, `optimize_streaming_latency: 0` and `with_timestamps: true`. Speed remains its native default of 1.0; a higher speed is not higher quality. MP3 bitrate does not apply to PCM. These are the relevant quality controls in the [Grok TTS guide](https://docs.x.ai/developers/model-capabilities/audio/text-to-speech).

The matching subdirectory contains `review.wav`, `timestamps.json` and `manifest.json`. Each clip retains the complete original response, request, response hash, native `source.pcm`, lossless `source.wav`, timestamps and provider identifiers. Opus previews are encoded once at 256 kb/s, the maximum mono Opus bitrate. The WAV masters preserve the source rate; no local upsampling disguises the router’s output.

## Loud versus plain follow-up

`bun scripts/auditionIrisQuality.ts --compare-loud` adds `private/iris-quality/xai-quality.opus` without changing the existing `xai-loud-quality.opus`. The plain preview contains five new, independent direct Grok calls with the same names, 48 kHz PCM, Quality mode, timestamps and text normalization off. The request bodies differ only by removing `<loud>…</loud>`. No volume matching is applied. Its lossless duration is 10.344 s; native PCM/WAV sources and timestamps are in `private/iris-quality/xai-quality`. All five plain takes returned nonuniform timestamps, without XML-tag characters.

The original loud preview was verified byte-for-byte unchanged. This is a review comparison, not a production preset change.

## What OpenRouter changes in these tests

- All ten OpenRouter requests returned 24 kHz despite the 48 kHz `provider.options.xai.output_format.sample_rate` request. All ten direct requests returned 48 kHz. The rate was checked against decoded PCM frame count and the provider’s duration, not just an HTTP header.
- All ten OpenRouter responses contained timestamp JSON but advertised `audio/pcm;rate=24000;channels=1`. A client trusting that header would mistake JSON bytes for audio. Direct Grok correctly advertised `application/json`.
- Timestamps are available through OpenRouter’s provider options; they are not categorically missing. Our existing generic narration decoder cannot consume these mislabeled envelopes, so this experiment uses a separate decoder without changing production behavior.
- OpenRouter documents a raw audio HTTP response and generic provider-specific passthrough. It does not document a native equivalent of Grok’s bidirectional TTS WebSocket on that endpoint. See [OpenRouter TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts).

This demonstrates a format/rate integration difference, not a proven audible improvement from 48 kHz. A higher output sample rate alone does not establish higher native synthesis bandwidth. Also, accepted options are not proof that the router honored every option internally.

## Timestamp fidelity caveat

All 20 REST generations returned character timings. Their arrays include XML-tag characters, not just spoken words. Two OpenRouter takes and one direct take were evenly interpolated over the entire utterance, to rounding precision. The other takes were nonuniform. This makes uniform timing an observed provider/response limitation, not an OpenRouter-only defect.

Do not label these results phoneme-accurate or use the tag characters as spoken captions. There is no separately documented high-fidelity timestamp quality dial beyond `with_timestamps`. The [API reference](https://docs.x.ai/developers/rest-api-reference/inference/voice) and guide describe slightly different timing shapes; the review decoder accepts both documented pair/object representations and preserves the original response for inspection. It never fabricates replacement alignment.

## Can Quality mode meet 1000 ms?

Yes in this small direct-WebSocket benchmark; an already-open socket provides considerably more margin. These are real measurements from Tower, using Iris, `<loud>`, 48 kHz PCM, Quality mode and normalization off. Each condition has five new-connection utterances and five second utterances on the same connections. Timestamp-on/off order alternates across texts.

| Timestamps | Connection | Minimum | Median | Maximum |
| --- | --- | --- | --- | --- |
| On | Already open | 325 ms | 357 ms | 368 ms |
| On | New, including handshake | 907 ms | 922 ms | 994 ms |
| Off | Already open | 321 ms | 360 ms | 373 ms |
| Off | New, including handshake | 877 ms | 957 ms | 980 ms |

“First playable” means enough received PCM for a 20 ms starting buffer. It excludes browser scheduling, a backend relay hop and audio-device latency. This is not an SLA, percentile guarantee or a complete click-to-sound measurement. Cold connections leave almost no headroom. The warm samples are immediate second utterances, not measurements after long idle periods.

A separate offline energy check found 5–50 ms of leading low-level audio in the timestamp-enabled takes. Adding that estimate gives roughly 340–398 ms on reused sockets and 937–999 ms on new sockets, still before device/UI overhead. This uses a −45 dBFS threshold over a 20 ms window, not a human audibility test; see `latency/speech-onset.json`.

Timestamps arrived after the first audio chunks and did not gate audio delivery. For live TTS, prefer a preconnected/reused server-side Grok WebSocket, play PCM as it arrives and consume timestamps asynchronously. Do not wait for the complete timestamp JSON or `audio.done` before playback. Keep keys on the backend. A strict worst-case deadline still needs prerendering/caching or another fallback; current Knottingham is already prerendered.

Evidence is in `private/iris-quality/latency/summary.json` and each session’s `result.json`, including event arrival times and trace IDs. No browser or speaker was operated during measurement.

## Cost and reproduction

[Grok’s published TTS pricing](https://docs.x.ai/developers/models/text-to-speech) is $ 15.00 per million input characters, with no documented extra tier for these quality, PCM or timestamp options. The 20 REST review clips contain 580 input characters including tags, approximately $ 0.0087 at list price; this is an estimate, not invoice verification. The separate latency tests also generate billable audio. No paid alignment service or premium processing tier was added.

```powershell
bun scripts/auditionIrisQuality.ts
bun scripts/benchmarkIrisLatency.ts
```

Use `XAI_API_KEY` and `OPENROUTER_API_KEY` from the local environment. Successful responses are reused; request reservations prevent silent paid retries. The audition command has an explicit `--retry-failed` option. Benchmarks retain their measurements rather than silently refreshing them; use a new `output` directory through the exported function for a fresh run.

No preset from this review should be applied to the game until approved.
