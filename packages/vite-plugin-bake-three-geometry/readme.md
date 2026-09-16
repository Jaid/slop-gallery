# vite-plugin-bake-three-geometry

Annotation-free, build-time evaluation of deterministic Three.js geometry recipes. Author ordinary constructors and functions; the plugin replaces supported work with compressed binary snapshots and synchronous resource factories.

```ts
import {defineConfig} from 'vite'
import bakeThreeGeometry from 'vite-plugin-bake-three-geometry'

export default defineConfig({
  plugins: [bakeThreeGeometry()],
})
```

The plugin applies only to client builds. Development and SSR keep the original implementation. Slop Gallery additionally enables it only in production mode.

## Automatic discovery

Discovery follows lexical bindings, named/default imports, re-exports and referenced local declarations. It recognizes approved Three APIs by import provenance, not class names or decorators.

There are three optimization boundaries:

1. **Parameterless definitions.** A class with a parameterless constructor, or a parameterless factory, can be evaluated as a complete recipe. Class initialization becomes a snapshot factory; instance methods, the class prototype and `new.target` remain intact. Field initializers are removed from the specialized class so they do not run again. Subclassing and constructor argument side effects are preserved.
2. **Closed expressions.** Calls and constructor expressions whose inputs are statically resolvable can be replaced directly. This includes constant arguments and local helper functions.
3. **Invariant inner expressions.** When an outer function has runtime parameters, an independent inner resource recipe can still be baked. The runtime-dependent tail remains ordinary JavaScript.

For example, this requires no source changes:

```ts
class Sculpture {
  geometry = new TorusKnotGeometry(0.45, 0.13, 256, 64)

  constructor() {
    this.geometry.computeTangents()
    this.geometry.computeBoundingBox()
  }

  dispose() {
    this.geometry.dispose()
  }
}
```

The evaluator runs actual approved Three constructors and helpers, including transformations, normals, tangents, curves, extrusion, merging and supported CSG operations. `three-bvh-csg` is an optional peer and is loaded only when a recipe imports it.

## Snapshot semantics

Snapshots contain **final buffers**, not `BufferGeometry.toJSON()` recipes that would reconstruct primitive geometry in the browser. They retain attributes, indices, groups, bounds, draw ranges, morph targets, interleaving, instanced attributes, typed-array representations and supported native prototypes. Owned collider arrays can travel alongside geometry in the same snapshot.

Every factory invocation creates fresh resources, IDs, UUIDs and mutable buffers. Aliases within one result are preserved; separate mounts do not share buffers or disposal lifetimes. Custom class methods are retained rather than replaced with a generic disposer. Shared singletons, captured mutable resource aliases, private class state and callback-bearing snapshots are declined.

This plugin does **not** serialize Rapier worlds or MeshBVHs. It can preserve already-computed collider input arrays, but adding a BVH serializer is a separate adapter feature.

## Limits

Automatic does not mean arbitrary JavaScript can be proven constant. Open parameters, state/props, clocks, unseeded randomness, unknown external APIs, browser globals, async work, accessors, reflective operations and observed captured-state mutations prevent baking. The original code remains in place, and recognized skipped recipes appear in the report.

There is no whole-program React prop-domain inference: `walls.map(wall => <WallSurface wall={wall} />)` is **not** expanded into every possible call inside `WallSurface`. JSX intrinsic geometry tags are not rewritten. Finite-domain specialization and automatic scene instancing are outside this plugin.

The evaluator assumes normal unmodified JavaScript/Three intrinsics and treats approved native libraries as trusted capabilities. It is an optimizer for trusted source, not a sandbox for adversarial code or a proof system for arbitrary cross-module alias mutation.

## Loading and cost

Each retained artifact is content-addressed and gzip-compressed. A generated ES module fetches/decompresses it using top-level await, before dependent application modules execute. Constructors and factory calls themselves stay synchronous. Equal artifacts share one module-level preload; returned resources remain independent.

This trades runtime generation for transfer, decompression and buffer copies. It does not remove GPU uploads, GPU shader compilation or draw calls, and does not promise a frame-rate improvement. By default, snapshots smaller than **32 KiB uncompressed** are left alone to avoid adding requests for cheap primitives.

Generated assets for tree-shaken recipes are removed. High-resolution source maps are supplied. Each watch build re-evaluates from fresh source and tracks recipe dependencies; there is no persistent build-result cache.

## Options and diagnostics

```ts
bakeThreeGeometry({
  include: /\/src\//u,
  exclude: /\/experimental\//u,
  minimumBytes: 32 * 1024,
  maxBytes: 64 * 1024 * 1024,
  timeoutMs: 10_000,
  compress: true,
  report: true,
  onDiagnostic(diagnostic) {
    // status: 'baked' | 'skipped', file, line, expression,
    // reason, bytes, rawBytes, evaluationMs, resources
  },
})
```

`include` and `exclude` also accept predicates receiving normalized absolute filenames. The default inclusion is project-root source outside `node_modules`. Dependencies may be followed outside the transform inclusion filter.

`bake-three-geometry.json` records transformation decisions and the retained artifact count. Recipe counts include transformations that can subsequently be tree-shaken; retained artifact counts reflect final output.

## Validation

```sh
bun test ./packages/vite-plugin-bake-three-geometry/test
bun packages/vite-plugin-bake-three-geometry/test/browser/run.ts
```

The optional browser regression requires `BROWSER` to name a Chromium executable with native WebGPU. It launches a separate headless process and temporary profile, never the visible game session, and compares original/baked geometry, data textures and canvas textures through GPU readback. It fails rather than silently claiming success when a GPU adapter is unavailable.
