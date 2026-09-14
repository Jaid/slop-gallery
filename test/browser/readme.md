# Passive WebGPU regression test

With the development server running and the existing browser listening on port 9223:

```sh
bun test/browser/run.ts
```

The runner attaches with `defaultViewport: null`. It does not navigate, focus, resize, send input, or attach elements to the page. The fixture renders to a detached canvas and verifies real WebGPU pixels, alpha, orientation, late material maps, StrictMode effect replay, and final canvas disposal. It uses the running Vite dependency generation to avoid loading a second React or Three instance. Fixture code is bundled into a data URL to avoid registering it for Vite HMR.

Run after source edits and Vite dependency optimization settle. A page reload during the test destroys its execution context and requires a new run.

For same-size WebGPU render-target recreation (Three #34301), which previously left cached render-pass descriptors pointing at destroyed GPU textures:

```sh
bun test/browser/run.ts webgpuRenderTargetRecreation.ts
```

Restart Vite first after changing a patched dependency so its optimized Three bundle includes the patch. The fixture renders to a detached RGBA16F target, forces `texture.needsUpdate` without changing target dimensions, renders again, and rejects any WebGPU validation error.

For the reusable material queue in main MRT and reflection-style targets:

```sh
bun test/browser/run.ts ../../packages/three-async-materials/test/browser/materials.ts
```

For the same checks using the gallery’s real Captured Tempest material:

```sh
bun test/browser/run.ts progressiveMaterials.ts
```

The shared fixture lives in packages/three-async-materials/test/browser/materials.ts; the gallery wrapper supplies Captured Tempest shading. It renders placeholders while two native asynchronous material pipelines compile and checks that activation does not synchronously compile a full-material variant. It also checks WebGPU validation and deferred resource cleanup. Cached driver results are not cold-start benchmarks.

For full-size nameplate atlas uploads, instanced UV row boundaries and late material invalidation:

```sh
bun test/browser/run.ts knotLabels.ts
```

This fixture uploads a 7200 × 8160 canvas atlas and checks the accent and background pixels of its first, row-boundary and final populated tiles. It does not interact with the live gallery.
