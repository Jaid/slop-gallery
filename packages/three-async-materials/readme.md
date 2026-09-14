# three-async-materials

A small, React-independent queue for progressive Three.js WebGPU material loading. It observes the render contexts of caller-supplied placeholder meshes, prepares one full material at a time with `compileAsync()`, and installs that material after all contexts observed during its warmup have finished.

It does not construct materials, choose placeholders, own scene resources, or implement a general job scheduler.

## Usage

```ts
import AsyncMaterials from 'three-async-materials'
import {Vector3} from 'three/webgpu'

const eye = new Vector3()
const position = new Vector3()
const queue = new AsyncMaterials(renderer, {
  // Optional. Lower scores load first; ties preserve registration order.
  // Read live world matrices rather than caching distances at registration.
  priority: mesh => position.setFromMatrixPosition(mesh.matrixWorld)
    .distanceToSquared(eye.setFromMatrixPosition(camera.matrixWorld)),
  onSettled({material, status, error, startedAt, contexts}) {
    if (status === 'failed') console.error(material.name, error)
    performance.measure('material.compile', {
      start: startedAt,
      detail: {id: material.name, status, contexts},
    })
  },
})

const binding = queue.add(fullMaterial)
mesh.material = placeholderMaterial
mesh.onBeforeRender = binding.onBeforeRender
binding.ref(mesh)
scene.add(mesh)

// Render normally. Observation admits visible meshes; compilation starts after
// the synchronous render stack, not inside a render-list traversal.

// On teardown, stop rendering these meshes and await outstanding native work.
await queue.disposeAsync()
// Only now release geometry/material resources used by compilation. Live render
// targets may resize or be disposed earlier; warmup uses private scratch targets.
```

Create **one queue per renderer**. Each binding manages one leaf Mesh and one full Material. Bindings do not automatically assign placeholders or replace mesh callbacks. If a mesh already has an `onBeforeRender` callback, compose it explicitly and invoke the binding callback with the mesh as `this`.

React/Fiber can pass `binding.ref` and `binding.onBeforeRender` directly as mesh props. Keep the queue and bindings stable across renders. Resource ownership, including StrictMode effect replay, belongs to the caller; the gallery uses `disposable-lifetime` around its owning class. There is no React adapter or React dependency.

## Behavior

- `add(material)` registers a binding but does not compile anything until its mesh is observed rendering.
- `priority(mesh, material)` is optional. With no callback, observed bindings are selected in registration order. Scores must be finite; they are recomputed before each material. Priority callbacks should be pure. In-flight work is not preempted.
- Context identity includes the actual scene, camera, render target, output target, MRT, target face/layer and mip level. Repeated observations are deduplicated. New contexts observed during compilation are visited before activation. Live render-target identities are observed only to distinguish variants; compilation uses tiny queue-owned structural clones of their attachment configuration, so caller-owned targets may resize, reallocate or be disposed while native async pipeline work is in flight.
- Temporary mesh material/visibility/culling and renderer target/MRT state are restored synchronously, before awaiting compilation. Ordinary frames keep using the placeholder.
- `ref(null)` pauses the binding and prevents late activation while detached. Synchronous detach/reattach of the same mesh preserves its warmup. Attaching a different mesh resets its context history; completion for the old mesh cannot activate the replacement.
- A failed binding keeps its existing material and does not block others. There are no automatic retries. The optional synchronous `onSettled` callback receives attempted warmups with `ready`, `failed` or `cancelled` status, the material/mesh, start time, attempted context count and any failure. Without a callback, failures are logged. Callback exceptions are logged without stopping the queue.
- `dispose()` immediately stops admission and activation. `disposeAsync()` also waits for unabortable in-flight compilation. Both are idempotent. Unstarted entries do not emit completion events. **Neither method disposes caller-owned resources.** Adding after disposal throws.

## Three.js dependency and limits

Validated against **Three 0.186.0**, using the WebGPU backend. This is not a WebGL queue. The peer range is restricted to the r186 release line.

The implementation relies on initialized r186 `compileAsync()` capturing the mesh material and render context synchronously, and restoring its render traversal before asynchronous node/pipeline building. Observation must come from actual rendering, which guarantees initialization. Rerun the native GPU regression when upgrading Three; public method signatures alone do not guarantee these timing semantics.

Keep geometry, full materials and scene lighting/configuration valid during compilation. Observed render targets do **not** need to remain GPU-valid after observation: the queue clones their attachment layout into private scratch targets before `compileAsync()`. Do not run another queue or unrelated `compileAsync()` work concurrently on this renderer. The queue is intended for ordinary main-scene and reflection-style passes. It is not a promise to precompile every shadow override, XR, or custom rendering path.

Contexts/configuration introduced **after activation** can still compile new variants during rendering. The queue does not eliminate native compilation cost or guarantee a particular startup frame rate. Visible placeholder geometry also does not reproduce a full material's vertex displacement.

## Tests

From the workspace root:

```sh
bun test ./packages/three-async-materials/test
bun test/browser/run.ts ../../packages/three-async-materials/test/browser/targetLifetime.ts
bun test/browser/run.ts ../../packages/three-async-materials/test/browser/materials.ts
bun test/browser/run.ts progressiveMaterials.ts
```

The target-lifetime fixture deliberately resizes the original live color+normal MRT and reflection targets while native pipeline creation is in flight and rejects any WebGPU validation error. The package's material fixture separately checks continued placeholder rendering, changed output pixels, both native asynchronous variants and no new full-material pipeline/programs on activation. The gallery fixture runs the material checks with its real Captured Tempest material and caller-owned resources.

The browser runner attaches to the existing browser on port 9223 without navigation, input, focus or viewport changes. Driver-cache-warm timings are not cold-start benchmarks.
