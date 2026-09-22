# voice-sample-store

Reusable OpenRouter voice synthesis storage used by `vite-plugin-import-voice-sample` and standalone tooling.

```ts
import VoiceSampleStore from 'voice-sample-store'

const voiceSampleStore = new VoiceSampleStore({
  rootFolder: import.meta.dir,
  app: 'https://example.com',
  cooldown: 1000,
  sampleRate: 24_000,
  trim: true,
  trimThreshold: -50,
})

const sample = await voiceSampleStore.prepare({
  text: 'Hello',
  voice: 'iris',
  language: 'en',
  emotion: 'loud',
  format: 'opus',
})
```

`rootFolder` is required because the store has no Vite context. Relative `folder`, `cacheFolder`, and `storageFolder` options resolve from it. The default base folder is `<rootFolder>/temp/voice-sample-store`. `cooldown` defaults to 1000 ms and spaces actual provider request starts by at least that amount; cache hits and deduplicated in-flight syntheses do not consume cooldown slots. Set it to `0` to disable throttling.

`prepare()` accepts the same synthesis/delivery properties as voice import attributes except Vite's `type`: `text`, `voice`, `language`, `emotion`, `format`, `trim`, and `trimThreshold`.

It returns the selected artifact `path`, canonical `rawPath`, selected `metadataPath`, decoded `metadata`, and the resolved `format`. For `format: 'timings'`, `path` is the MessagePack metadata path. Every MessagePack metadata object includes `voice` and `input`; `input` is the exact styled text sent to OpenRouter (for example `<loud>Hello</loud>`), not merely the unstyled `text` passed to `prepare()`.

The store owns OpenRouter requests, canonical raw WAV/MessagePack storage, sample-rate inference, trimming and aligned timing transforms, PCM extraction, and Opus conversion. Raw synthesis identity excludes format and trim settings so derivatives share one paid synthesis.
