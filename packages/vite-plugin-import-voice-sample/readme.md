# vite-plugin-import-voice-sample

Generate and cache static voice samples and character timings from declarative imports.

```ts
// Uses the default speaker, Iris, and returns a URL by default.
import grokAudioUrl from 'voice:grok' with {
  text: 'Grok',
  format: 'opus',
}

// The optional second path component overrides the speaker.
import grokAraAudioUrl from 'voice:grok/ara' with {
  text: 'Grok',
  format: 'opus',
}

// Load bytes into the runtime instead of returning a URL.
import grokAudioBytes from 'voice:grok' with {
  text: 'Grok',
  format: 'opus',
  type: 'contents',
}

// Timings default to contents.
import grokTimings from 'voice:grok' with {
  text: 'Grok',
  format: 'timings',
}

// Or reference the stored MessagePack metadata by URL.
import grokMetadataUrl from 'voice:grok' with {
  text: 'Grok',
  format: 'timings',
  type: 'reference',
}
```

Import sources are `voice:<id>` or `voice:<id>/<speaker>`. The ID identifies the import site but is not part of the synthesis hash. The optional speaker path component overrides the configured default speaker, which is `iris`.

The accepted import attributes are:

- `text: string` — required
- `emotion: string` — optional
- `language: string` — defaults to `en`
- `format: 'opus' | 'pcm' | 'wav' | 'timings'` — defaults to `opus`
- `type: 'contents' | 'reference'`
  - audio formats default to `reference`
  - `timings` defaults to `contents`

## Runtime values

`type: 'reference'` always returns a URL. For audio formats it points at the selected audio asset; for `timings` it points at the stored `.msgpack` metadata.

`type: 'contents'` materializes data into the target runtime:

- `format: 'timings'` returns `ReadonlyArray<{char, start, end}>`
- audio formats return a binary object chosen from the current Vite environment:
  - Node-like server environments: `Buffer`
  - browser/worker environments: `Uint8Array`

The plugin uses Vite's per-environment `consumer` and resolved Node builtins to distinguish a Node-like server from browser/worker targets, so worker-style server environments do not receive a Node-only `Buffer`.

TypeScript does not currently specialize an ambient module's default-export type from custom import attributes. The app therefore keeps `voice:*` declared as the default/reference `string` type. The package exports helper types for explicit contents typing:

```ts
import type {VoiceSampleContents, VoiceSampleValue} from 'vite-plugin-import-voice-sample'

type AudioContents = VoiceSampleContents<'opus'> // Uint8Array; Buffer is a compatible subtype
type TimingsContents = VoiceSampleContents<'timings'>
type AudioReference = VoiceSampleValue<'opus', 'reference'> // string
```

## Storage

The hash identifies the synthesis itself and deliberately excludes the requested output format, load type, and import ID. WAV, Opus, PCM, timing contents, and references with otherwise identical synthesis inputs therefore share one OpenRouter generation.

Every generated synthesis is stored canonically as:

```text
temp/vite-plugin-import-voice-sample/
  store/
    <hash>.wav
    <hash>.msgpack
```

The WAV is the lossless raw source. The MessagePack metadata contains character timings plus generation metadata such as duration, sample rate, and OpenRouter trace ID.

Requested conversions are derived from that stored WAV and cached separately:

```text
temp/vite-plugin-import-voice-sample/
  cache/
    <hash>.opus
    <hash>.pcm
```

An Opus file exists only when a dependent needs Opus. PCM is never part of the raw store; an explicit PCM import extracts PCM from the stored WAV and caches it. WAV imports use `store/<hash>.wav` directly. Timing imports read or reference the MessagePack metadata and create no audio conversion.

Store/cache hits never contact OpenRouter. Cache misses use `OPENROUTER_API_KEY`. OpenRouter's timestamp-enabled response carries PCM in a timed envelope; the plugin derives the actual sample rate from PCM length and provider duration and immediately wraps it into the canonical stored WAV.

`emotion` maps semantic names such as `cheerful`, `calm`, `excited`, and `dramatic` onto xAI wrapping speech tags. Native wrapping tags such as `soft`, `whisper`, `loud`, and `emphasis` can also be used directly.

```ts
// vite.config.ts
import importVoiceSample from 'vite-plugin-import-voice-sample'

export default {
  plugins: [
    importVoiceSample(),
  ],
}
```

Options can override the storage directory, model, defaults, API key, or ffmpeg executable. The API key is only used inside Vite and is never emitted into client code.
