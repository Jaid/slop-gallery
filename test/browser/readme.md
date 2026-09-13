# Passive WebGPU regression test

With the development server running and the existing browser listening on port 9223:

```sh
bun test/browser/run.ts
```

The runner attaches with `defaultViewport: null`. It does not navigate, focus, resize, send input, or attach elements to the page. The fixture renders to a detached canvas and verifies real WebGPU pixels, alpha, orientation, late material maps, StrictMode effect replay, and final canvas disposal. It uses the running Vite dependency generation to avoid loading a second React or Three instance. Fixture code is bundled into a data URL to avoid registering it for Vite HMR.

Run after source edits and Vite dependency optimization settle. A page reload during the test destroys its execution context and requires a new run.

For progressive full-material loading in main MRT and reflection-style targets:

```sh
bun test/browser/run.ts progressiveMaterials.ts
```

This fixture uses real Captured Tempest shading. It renders placeholders while two native asynchronous material pipelines compile and checks that activation does not synchronously compile a full-material variant. It also checks WebGPU validation and deferred resource cleanup. Cached driver results are not cold-start benchmarks.
