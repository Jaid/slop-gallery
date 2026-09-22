# vite-plugin-import-voice-sample

Generate and cache static voice samples and character timings from declarative imports.

```ts
// Uses the default speaker, Iris.
import grokAudio from 'voice:grok' with {
  text: 'Grok',
  format: 'opus',
}

// The optional second path component overrides the speaker.
import grokAraAudio from 'voice:grok/ara' with {
  text: 'Grok',
  format: 'opus',
}

// Timings are another format of the same synthesis.
import grokTimings from 'voice:grok' with {
  text: 'Grok',
  format: 'timings',
}
```

Import sources are `voice:<id>` or `voice:<id>/<speaker>`. The ID only identifies the import site; it is not part of the synthesis hash. The optional speaker path component overrides the configured default speaker, which is `iris`.

The accepted import attributes are:

- `text: string` — required
- `emotion: string` — optional
- `language: string` — defaults to `en`
- `format: 'opus' | 'pcm' | 'wav' | 'timings'` — defaults to `opus`

`format: 'timings'` returns the character timing array directly:

```ts
ReadonlyArray<{
  char: string
  start: number
  end: number
}>
```

## Storage

The hash identifies the synthesis itself and deliberately excludes both the requested output format and the import ID. WAV, Opus, PCM, and timing imports with otherwise identical synthesis inputs therefore share one OpenRouter generation.

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

An Opus file exists only when a dependent imports `format: 'opus'`. PCM is never part of the raw store; an explicit `format: 'pcm'` import extracts PCM from the stored WAV and caches it. A `format: 'wav'` import directly serves `store/<hash>.wav`. A `format: 'timings'` import reads MessagePack metadata and creates no audio conversion.

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
