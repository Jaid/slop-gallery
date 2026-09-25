# vite-plugin-bake-three

Combined annotation-free build-time optimization for Three.js and React Three Fiber.

```ts
import {defineConfig} from 'vite'
import bakeThree from 'vite-plugin-bake-three'

export default defineConfig({
  plugins: [
    ...bakeThree(),
  ],
})
```

The aggregate runs its passes in dependency order:

```text
vite-plugin-bake-three
├─ vite-plugin-bake-three-geometry
│  └─ vite-plugin-bake-core
├─ vite-plugin-bake-static-textures
│  └─ vite-plugin-bake-core
└─ vite-plugin-r3f-static-rendering
   └─ vite-plugin-bake-core
```

Its implementation packages are nested workspaces of this package. They remain independently named packages so advanced consumers can import a single pass directly, while ordinary applications only need `vite-plugin-bake-three`.

## Features

- Deterministic `BufferGeometry` recipes are evaluated at build time and restored from owned binary snapshots.
- `math` and its subpath APIs are available to every bake pass as trusted build-time math capabilities.
- `MeshBVH` construction can be serialized together with the exact geometry it indexes.
- Deterministic `DataTexture` and synchronous Canvas2D recipes are rasterized at build time.
- Closed R3F render regions can be lowered into precomputed `InstancedMesh` batches and WebGPU `BundleGroup`s.
- Unsupported or runtime-dependent code remains untouched; source annotations are not required.

## Configuration

Every pass is enabled by default. Pass `false` to disable one or pass its native options through the aggregate:

```ts
bakeThree({
  // Off by default: when enabled, random values are sampled once during the build
  // and the sampled result is frozen into the emitted artifact/plan.
  allowFreezingRandomness: false,
  geometry: {
    meshBvh: true,
    minimumBytes: 64 * 1024,
  },
  staticTextures: {
    minimumBytes: 16 * 1024,
  },
  staticRendering: {
    staticInstancing: {minimumCount: 4},
    renderBundles: {minimumObjects: 6},
  },
})
```

```ts
bakeThree({
  staticRendering: false,
})
```

`allowFreezingRandomness` defaults to `false` and applies to all enabled passes. A pass can override it in its own options. Seeded `math/random` and `math/noise` recipes remain bakeable in strict mode; opting in additionally permits `Math.random()`, the `math/random` seed helpers and Three's default-random `SimplexNoise` constructor.

The individual factories are also re-exported:

```ts
import {
  bakeStaticTextures,
  bakeThreeGeometry,
  r3fStaticRendering,
} from 'vite-plugin-bake-three'
```

## Workspace layout

```text
packages/vite-plugin-bake-three/
├─ src/
├─ test/
├─ package.json
└─ packages/
   ├─ vite-plugin-bake-core/
   ├─ vite-plugin-bake-three-geometry/
   ├─ vite-plugin-bake-static-textures/
   └─ vite-plugin-r3f-static-rendering/
```

`package.json` declares `"workspaces": ["packages/*"]`, so the Three compiler family is self-contained and can be developed or extracted as one nested workspace tree.
