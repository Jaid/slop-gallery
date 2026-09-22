# vite-plugin-import-voice-sample

Generate and cache static voice samples and character timings from declarative import attributes.

```ts
import welcomeAudio from 'voice-sample:welcome' with {
  voice: 'iris',
  text: 'Hello, I am Iris!',
  emotion: 'cheerful',
  language: 'en',
  format: 'opus',
}

import welcomeTimings from 'voice-sample:welcome/timings' with {
  voice: 'iris',
  text: 'Hello, I am Iris!',
  emotion: 'cheerful',
  language: 'en',
  format: 'opus',
}
```

The audio import returns its emitted asset URL. Adding `/timings` to the same import source returns a typed array of character timings:

```ts
ReadonlyArray<{
  char: string
  start: number
  end: number
}>
```

## Storage

The hash identifies the synthesis itself and deliberately excludes the requested output format. WAV, Opus, PCM, and `/timings` imports with otherwise identical attributes therefore share one OpenRouter generation.

Every generated synthesis is stored canonically as:

```text
temp/vite-plugin-import-voice-sample/
  store/
    <hash>.wav
    <hash>.msgpack
```

The WAV is the lossless raw source. The MessagePack metadata contains the character timings plus generation metadata such as duration, sample rate, and OpenRouter trace ID.

Requested conversions are derived from that stored WAV and cached separately:

```text
temp/vite-plugin-import-voice-sample/
  cache/
    <hash>.opus
    <hash>.pcm
```

An Opus file exists only when a dependent imports `format: 'opus'`. PCM is never part of the raw store; an explicit `format: 'pcm'` import unpacks the stored WAV and caches the extracted PCM. A `format: 'wav'` import directly serves `store/<hash>.wav`. A `/timings` import reads the MessagePack metadata and does not create an audio conversion.

The source may be `voice-sample` or a named alias such as `voice-sample:welcome`; aliases are useful when a file imports several samples. The default attributes are `voice: 'iris'`, `language: 'en'`, and `format: 'opus'`; `text` is required. `format` can be `pcm`, `wav`, or `opus`.

Cache/store hits never contact OpenRouter. Cache misses use `OPENROUTER_API_KEY`. OpenRouter's timestamp-enabled speech response carries PCM in a timed envelope; the plugin derives the actual sample rate from PCM length and provider duration and immediately wraps it into the canonical stored WAV.

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
