# vite-plugin-bake-static-textures

Automatically evaluate deterministic Three.js pixel generators and synchronous `canvas-textures` recipes during client builds. No decorators, comments or `bake()` wrappers are required.

```ts
import {defineConfig} from 'vite'
import bakeStaticTextures from 'vite-plugin-bake-static-textures'

export default defineConfig({plugins: [bakeStaticTextures()]})
```

Combine with `vite-plugin-bake-three-geometry` when both kinds of resources occur in the application. Both plugins use `vite-plugin-bake-core` for binding resolution, dependency slicing, snapshots and source maps; native build dependencies never enter the browser runtime.

## What it discovers

A recipe can be a parameterless class/factory, a closed call with static arguments, or a static inner expression in an otherwise dynamic function. Imports and aliases are followed by binding identity.

```ts
class GrainTextures {
  readonly map: DataTexture

  constructor() {
    const pixels = new Uint8Array(512 * 512 * 4)
    // Deterministic pixel generation, including locally seeded noise.
    this.map = new DataTexture(pixels, 512, 512)
  }

  dispose() {
    this.map.dispose()
  }
}
```

For a partly dynamic recipe:

```ts
function wallTexture(width: number, height: number) {
  const texture = renderCanvasTexture({
    width: 512,
    height: 512,
    draw(context) {
      // Drawing depends only on local literals and deterministic helpers.
    },
  })
  texture.repeat.set(width * 0.55, height * 0.55)
  return texture
}
```

The raster can be baked while `repeat.set(...)` remains at runtime. There is no need to annotate the function or enumerate every wall size.

Approved producer boundaries include Three `DataTexture`/`Texture`/`CanvasTexture` and the synchronous `canvas-textures/three` exports `renderCanvasTexture` (default) and `textureFromPixels`. The build-only `canvas-textures` default implementation supplies `ReadbackCanvas`. The synchronous API contract is implemented by an isolated `@napi-rs/canvas` adapter, not a global fake browser environment.

## Fidelity and ownership

DataTexture buffers preserve their original typed-array representation, including Float32 and half-float bit patterns. The plugin does not quantize, apply gamma conversions or reinterpret linear normal/height maps as sRGB images. Color space, format/type, sampling filters, wrapping, UV transforms, anisotropy, mipmap policy, orientation and supported source sharing are preserved.

Canvas recipes are rasterized by Skia at build time and restored into **ordinary canvas-backed textures** in the browser. They do not silently become DataTextures. Each factory call owns its canvas; disposal releases only that call's canvas. Numeric DataTexture output is preserved byte-for-byte; Skia drawing is not promised to match every browser/version's rasterization bit-for-bit.

Resources and source objects get fresh native IDs/UUIDs. Aliases within one result survive, but independent mounts own independent mutable buffers and disposal lifetimes. Existing custom class methods remain intact.

## Deliberate exclusions

Font-dependent drawing (`fillText`, `strokeText`, `measureText`) and external image composition (`drawImage`) remain runtime work. So do asynchronous `prepare` recipes, React texture hooks, runtime input/state, unseeded randomness, arbitrary network activity, unknown imports and observed captured-state mutations. In particular, installing this plugin does **not** automatically bake the asynchronous Knottingham label/preview atlases.

The compiler follows a conservative supported subset, not arbitrary whole-program JavaScript. Approved libraries and normal unmodified intrinsics are trusted. This is not an untrusted-code sandbox; cross-module aliases manipulated by unrelated application code are outside its proof model.

There is no shader baking, PMREM generation, KTX2 compression, atlas packing, channel repacking or image-format conversion. The output is exact numeric resource data in compressed binary assets, not JXL/AVIF files. GPU uploads and mipmap generation still happen where the restored texture requests them.

## Loading and configuration

Retained snapshots are emitted as content-addressed gzip-compressed `.bin` assets. Generated ES modules preload/decompress them with top-level await; the original constructors and factories remain synchronous. This makes the resources eager dependencies of their importing module, not lazy-on-first-call downloads. Identical artifacts share a preload, not mutable texture instances.

```ts
bakeStaticTextures({
  include: /\/src\//u,
  minimumBytes: 8 * 1024,
  maxBytes: 64 * 1024 * 1024,
  timeoutMs: 10_000,
  compress: true,
  report: true,
})
```

The shared options also include `exclude` and `onDiagnostic`. Filters accept normalized absolute-path predicates. Uncompressed snapshots below 8 KiB are skipped by default. Build-time canvases are additionally limited to 16,777,216 pixels.

`bake-static-textures.json` lists baked and skipped resource candidates with source locations and reasons. Unused artifacts are removed after tree-shaking. Watch rebuilds start with fresh evaluation state and track referenced files. Content hashes support output deduplication and client caching; no persistent build-evaluation cache is implemented.

Measure startup transfer/decode/generation tradeoffs for the target workload. Moving deterministic work to the build does not by itself prove faster startup or reduced GPU memory use.

## Tests

```sh
bun test ./test
```

Tests cover exact pixel representations, sampling/orientation, source aliases, fresh lifetimes, Canvas2D round-trips and declined font-dependent drawing. The geometry package also contains an optional detached native-WebGPU regression for both plugins' restored resources.
