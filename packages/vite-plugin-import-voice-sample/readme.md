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
- `cacheFolder?: string` — conversion cache override; defaults to `<folder>/cache`.
- `storageFolder?: string` — raw storage override; defaults to `<folder>/store`.

Explicit `cacheFolder` and `storageFolder` paths also resolve from the Vite root when relative.

The canonical raw store is:

```text
<storageFolder>/
  <hash>.wav
  <hash>.msgpack
```

Requested conversions are cached separately:

```text
<cacheFolder>/
  <conversion-hash>.opus
  <hash>.pcm
```

PCM is never stored as raw data. WAV imports use the stored WAV directly. Timing imports read or reference the MessagePack metadata and create no audio conversion.

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

- `sampleRate?: number` — requested xAI PCM sample rate in Hz; defaults to `48000`.
- `bitrate?: number` — Opus encoder bitrate in bits/s; used only for Opus conversion.

When `bitrate` is omitted:

```ts
Math.round(0.68266 * sampleRate)
```

For the default 48 kHz sample rate this is 32,768 bit/s; at 24 kHz it is 16,384 bit/s.

`sampleRate` is part of the raw synthesis identity. `bitrate` is not: changing bitrate reuses the canonical WAV + MessagePack store and creates a separately keyed Opus derivative.

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
