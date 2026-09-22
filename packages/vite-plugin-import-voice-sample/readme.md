# vite-plugin-import-voice-sample

Generate and cache static voice samples and character timings from declarative imports.

The Vite plugin is a thin import/runtime adapter over the nested `voice-sample-store` package. Provider requests, raw storage, trimming, timing alignment, and audio conversion live in that reusable store and are also available to standalone scripts through `new VoiceSampleStore({rootFolder, ...})` and `prepare({...})`.

```ts
// Uses the default speaker, Iris, returns a URL, and trims quiet outer edges.
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

// Timings default to contents and follow the same trimmed timeline.
import grokTimings from 'voice:grok' with {
  text: 'Grok',
  format: 'timings',
}

// Import attributes are string-valued, so delivery overrides use strings.
import rawGrok from 'voice:grok-raw' with {
  text: 'Grok',
  format: 'wav',
  trim: 'false',
}

import softerTrimGrok from 'voice:grok-softer-trim' with {
  text: 'Grok',
  format: 'opus',
  trimThreshold: '-60',
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
- `trim: 'true' | 'false'` — overrides the plugin-level trim setting
- `trimThreshold: string` — finite dBFS value at or below 0, for example `'-50'`

## Trimming and timings

Trimming is enabled by default. The plugin default is:

```ts
importVoiceSample({
  trim: true,
  trimThreshold: -50,
})
```

The threshold is dBFS. Trimming only considers the outer edges; internal pauses are never removed. An edge needs at least 20 ms below the threshold before it is trimmed, and 10 ms of padding is retained around detected speech.

Raw synthesis remains immutable in `storageFolder`. Its MessagePack metadata records the selected `voice` and exact styled provider `input`. Trimming creates a shared derivative WAV and MessagePack metadata in `cacheFolder`; derived metadata preserves those provenance fields, and WAV/PCM/Opus/timing imports with the same trim settings all reuse that derivative.

Timing data is transformed onto exactly the same retained audio timeline:

- every provider character is preserved
- each `start`/`end` is shifted by the removed leading duration
- intervals that fall before or after retained audio are clamped to 0 or the trimmed duration
- derived metadata `duration` is calculated from the exact retained PCM sample count rather than the provider's approximate duration

A trimmed metadata reference includes a `trim` object:

```ts
type VoiceSampleTrimMetadata = {
  changed: boolean
  minimumSilenceSeconds: number
  paddingSeconds: number
  removedEndSeconds: number
  removedStartSeconds: number
  sourceDuration: number
  thresholdDb: number
}
```

Thus `format: 'timings', type: 'contents'` returns shifted/clamped timings directly, while `format: 'timings', type: 'reference'` returns the URL of the corresponding derived MessagePack metadata.

`trim` and `trimThreshold` are delivery properties, not synthesis properties. Different trim settings reuse the same OpenRouter generation but receive distinct derivative cache entries.

## Runtime values

`type: 'reference'` always returns a URL. For audio formats it points at the selected audio asset; for `timings` it points at the selected raw or derived `.msgpack` metadata.

`type: 'contents'` materializes data into the target runtime:

- `format: 'timings'` returns `ReadonlyArray<{char, start, end}>`
- audio formats return:
  - `Buffer` in Node-like Vite server environments
  - `Uint8Array` in browser/worker environments

The plugin uses Vite's per-environment consumer and resolved Node builtins to avoid emitting Node-only `Buffer` code for worker-style server targets.

TypeScript does not currently specialize an ambient module's default-export type from custom import attributes. The app therefore keeps `voice:*` declared as the default/reference `string` type. The package exports helper types for explicit contents typing.

## Folders

The default base folder is:

```text
<Vite root>/temp/vite-plugin-import-voice-sample
```

Options:

- `folder?: string` — base folder; relative paths resolve from the Vite root.
- `cacheFolder?: string` — derivative/conversion cache override; defaults to `<folder>/cache`.
- `storageFolder?: string` — raw storage override; defaults to `<folder>/store`.

Explicit `cacheFolder` and `storageFolder` paths also resolve from the Vite root when relative.

The canonical raw store is always untrimmed:

```text
<storageFolder>/
  <synthesis-hash>.wav
  <synthesis-hash>.msgpack
```

When trimming is enabled, the shared trim derivative is cached as:

```text
<cacheFolder>/
  <trim-hash>.wav
  <trim-hash>.msgpack
```

Requested conversions are cached from the selected raw/trimmed WAV:

```text
<cacheFolder>/
  <opus-conversion-hash>.opus
  <source-hash>.pcm
```

PCM is never stored as raw data. With `trim: false`, WAV and timing references can point directly at canonical storage. With trimming enabled, they use the trim derivative.

## OpenRouter app attribution

The `app` option controls OpenRouter's attribution headers:

```ts
type App = {
  title: string
  url: string
}
```

It accepts either a full `App` object or a URL shorthand:

```ts
importVoiceSample({
  app: 'https://example.com/my-app',
})
```

The shorthand is normalized with `tinyhand`; its URL is used unchanged and its title becomes the URL hostname (`example.com` in the example).

An expanded object is used exactly:

```ts
importVoiceSample({
  app: {
    title: 'My App',
    url: 'https://example.com/my-app',
  },
})
```

When omitted, the default remains:

```ts
{
  title: 'Slop Gallery',
  url: 'https://slop.gallery',
}
```

These become `X-OpenRouter-Title` and `HTTP-Referer` respectively.

## Synthesis and Opus options

The plugin accepts:

- `sampleRate?: number` — requested xAI PCM sample rate in Hz; defaults to `24000`.
- `bitrate?: number` — Opus encoder bitrate in bits/s; used only for Opus conversion.
- `trim?: boolean` — defaults to `true`.
- `trimThreshold?: number` — dBFS threshold, defaults to `-50`.

When `bitrate` is omitted:

```ts
Math.round(0.68266 * sampleRate)
```

For the default 24 kHz sample rate this is 16,384 bit/s; at 48 kHz it is 32,768 bit/s.

`sampleRate` is part of the raw synthesis identity. `bitrate`, `trim`, and `trimThreshold` are derivative concerns: changing them reuses the canonical WAV + MessagePack store and creates separately keyed derived assets as needed.

Store/cache hits never contact OpenRouter. Cache misses use `OPENROUTER_API_KEY`. The API key is only used inside Vite and is never emitted into client code.

## Vite setup

```ts
import importVoiceSample from 'vite-plugin-import-voice-sample'

export default {
  plugins: [
    importVoiceSample(),
  ],
}
```
