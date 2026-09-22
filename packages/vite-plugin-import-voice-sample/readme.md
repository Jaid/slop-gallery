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

Both imports share one OpenRouter synthesis and one cache entry when their attributes match. Timings are fetched for every generated sample and cached beside the audio as `<hash>.timings.json`.

The source may be `voice-sample` or a named alias such as `voice-sample:welcome`; aliases are useful when a file imports several samples. The default attributes are `voice: 'iris'`, `language: 'en'`, and `format: 'opus'`; `text` is required. `format` can be `pcm`, `wav`, or `opus`.

A sample is keyed by its complete synthesis request and the configured model. Cache hits never contact OpenRouter. Cache misses use `OPENROUTER_API_KEY` and are written to `temp/vite-plugin-import-voice-sample/cache` by default.

OpenRouter's timestamp-enabled speech response carries PCM in a timed envelope. The plugin derives the actual sample rate from PCM length and provider duration instead of trusting the HTTP content type. PCM is cached directly, WAV is wrapped locally without re-encoding, and Opus is transcoded from that PCM with `ffmpeg`/libopus before caching.

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

Options can override the cache directory, model, defaults, API key, or ffmpeg executable. The API key is only used inside Vite and is never emitted into client code.
