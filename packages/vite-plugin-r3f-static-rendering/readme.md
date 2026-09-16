# vite-plugin-r3f-static-rendering

Annotation-free production compilation of closed React Three Fiber render graphs. One analyzer feeds two independently configurable optimizations: **static instancing** and **WebGPU render bundles**.

```ts
import {defineConfig} from 'vite'
import bakeThreeGeometry from 'vite-plugin-bake-three-geometry'
import bakeStaticTextures from 'vite-plugin-bake-static-textures'
import r3fStaticRendering from 'vite-plugin-r3f-static-rendering'

export default defineConfig({
  plugins: [
    bakeThreeGeometry(),
    bakeStaticTextures(),
    r3fStaticRendering(),
    // React Compiler / JSX compilation follows these transforms.
  ],
})
```

The plugin applies to client builds, not development serving or SSR. Slop Gallery enables it in production mode. Application source needs no decorators, wrappers, comments or resource registration.

## Package graph

```text
vite-plugin-bake-core
├─ vite-plugin-bake-three-geometry
│  ├─ geometry and owned collider arrays
│  └─ optional MeshBVH serialization
├─ vite-plugin-bake-static-textures
└─ vite-plugin-r3f-static-rendering
   ├─ closed JSX analysis
   ├─ staticInstancing
   └─ renderBundles
```

The shared `SourceGraph` and `Recipe.evaluateValue()` machinery resolves constants and imported/re-exported declarations. R3F-specific analysis turns supported JSX into **inert data** before evaluating that data recipe. It never executes React components, hooks or an application module's unrelated top-level statements.

## Static instancing

```tsx
{[0, 1, 2, 3].map(x => <mesh key={x} position={[x * 2, 0, 0]}>
  <boxGeometry args={[1, 2, 3]} />
  <meshStandardNodeMaterial color='#734129' roughness={0.8} />
</mesh>)}
```

This becomes one owned `InstancedMesh`, one geometry and one material. Instance matrices are composed at build time and emitted as data; runtime copies them into the native instance attribute and computes aggregate bounds. Anonymous static group transforms can be composed into those matrices; named groups are preserved.

Only **contiguous** interchangeable mesh families are combined. Geometry recipes, material recipes and render flags must match. The transform does not reorder arbitrary siblings to find larger batches. A material recipe here means owned inline JSX with identical static arguments/properties, not an externally mutable material instance.

Names, refs, user data, events, mirrored/singular transforms, incompatible shear, transparent/order-dependent materials, and open runtime values prevent instancing. The default minimum is three meshes.

## Render bundles

After instancing, the compiler recounts the remaining renderable objects. A closed opaque graph with at least four draw objects can be wrapped in a native Three `BundleGroup`. A four-mesh family reduced to one instance batch therefore does **not** receive an unnecessary render bundle at the default thresholds.

Bundles preserve each remaining mesh's identity, name, local transform, geometry/material ownership and shadow flags. Static bundled meshes have CPU frustum culling disabled: Three caches a bundle's render list, so retaining the first camera position's culling selection could permanently omit objects when the camera moves. GPU clipping remains active. The tradeoff is potentially more offscreen work; bundle insertion is not automatically a performance win.

A shared pre-render guard invalidates bundles when relevant renderer settings, visible light topology, shadow configuration, fog/environment identity or override-material identity/version changes. It runs after normal frame updates using Fiber's `before: 'render'` phase. One signature scan is shared per scene/renderer/frame. Ordinary light movement/intensity values remain uniform updates rather than forcing re-recording. Instancing-only plans have this frame job disabled.

Each renderer owns its native per-camera/per-render-target bundle caches. The package does not patch Three prototypes, cache native GPU pipeline objects itself, or hold caller-owned render targets across asynchronous operations.

## Supported discovery boundaries

The compiler considers static `<group>` subtrees, fragments, render-position `.map()`/`.flatMap()` expressions, and contiguous static sibling regions within a partly dynamic graph. A dynamic sibling is a boundary, not a reason to discard an adjacent independently static region.

Known intrinsic meshes need exactly one owned geometry child and one supported node-material child. Supported geometry families include boxes, capsules, circles, cones, cylinders, platonic solids, planes, rings, spheres, tori and torus knots. Materials include the basic, standard, physical, normal, Lambert and Phong node materials, using a conservative set of static scalar/color/boolean properties. Geometry construction itself remains a runtime step in these render plans; this plugin optimizes object count and command submission, not every geometry constructor into a binary artifact.

Import aliases and named/default re-exports of constant data are resolved by binding identity. Collections must be closed for the build. Arrays consumed by `.length`, indexing, further array operations or non-render code are not replaced with React elements.

## Safety boundaries

Opaque components are not expanded. The compiler does not infer React prop domains, reach inside hooks, rewrite physics components or assume arbitrary imported resources are immutable. Known `branch-component` ancestors are transparent to the analysis, but unknown/physics/interaction ancestors are barriers. Direct frame-loop or imperative Three-state access in the enclosing component is also a barrier.

The current supported subset excludes JSX spreads, event handlers, refs, user data, resource attachments, custom shaders, texture-bound materials, external geometry/material objects, transparent or depth-order-dependent surfaces, and runtime-dependent structure/properties. Unsupported candidates are reported and left unchanged. Named meshes can be bundled but not collapsed into instances.

This is conservative local analysis, **not whole-program proof against arbitrary scene traversal/mutation elsewhere in the application**. It assumes normal unmodified Three/Fiber intrinsics and that otherwise unexposed static objects are not discovered and mutated by unrelated code. Exclude a source path when external systems manipulate its render graph. In particular, changing a compiled object's visibility, material assignment or topology imperatively is outside the generated static graph's contract.

## Runtime lifetime

Content-identical plans share immutable emitted module data. They never share mutable Three resources across mounts. Each mount creates and owns its geometry, materials, instance attributes and scene objects; source aliases are not silently pooled. `disposable-lifetime/react` owns mount/disposal behavior, including StrictMode effect replay. Generated primitive roots use `dispose={null}` because the resource owner performs cleanup exactly once.

The lightweight runtime imports only React, Fiber, Three and the lifetime helper. Babel, Vite, Node APIs and the static evaluator do not enter client output. Constructor imports are emitted per plan so unused geometry/material constructors remain eligible for tree-shaking.

## Configuration

```ts
r3fStaticRendering({
  staticInstancing: {minimumCount: 3},
  renderBundles: {minimumObjects: 4},
  include: /\/src\//u,
  exclude: /\/imperative-scenes\//u,
  timeoutMs: 1000,
  maxNodes: 10_000,
  maxPlanBytes: 1024 * 1024,
  report: true,
  onDiagnostic(diagnostic) {
    // file, line, status, reason, batches, bundles,
    // objectsBefore, objectsAfter
  },
})
```

Either feature can be set to `false` or `{enabled: false}`. Minimum thresholds must be integers of at least two. Include/exclude also accept predicates receiving normalized absolute filenames. The default transforms project-root `.tsx`/`.jsx` files outside `node_modules`.

`r3f-static-rendering.json` reports source regions, retained plan count, successful transformations and skipped candidates with reasons. Source paths/diagnostics are potentially publishable source information; set `report: false` when that is undesirable. Plan imports are tree-shakeable, and unused plans disappear with their consumers. Watch builds start with fresh analysis and track referenced source/re-export files. High-resolution source maps accompany changes.

## Tests

```sh
bun test ./packages/vite-plugin-r3f-static-rendering/test
bun packages/vite-plugin-r3f-static-rendering/test/browser/run.ts
```

The suite includes executable Vite builds, source-map/directive behavior, dependency changes, feature controls, unsafe-case exclusions, transform composition, source identity, fresh resources, disposal and bundle invalidation. The browser regression compiles plans, then compares the original and optimized scenes using native WebGPU readback: instancing, initial/cached bundle rendering, camera movement beyond the original frustum, target switching/resizing and light-topology changes.

The browser runner requires `BROWSER` to point to a WebGPU-capable Chromium executable. It uses a separate headless process and temporary profile, never the visible gallery's input, focus or viewport, and fails explicitly when no WebGPU adapter is available. Pixel-equivalence tests do not constitute cold-start or frame-time benchmarks; measure those tradeoffs in a representative application trace.
