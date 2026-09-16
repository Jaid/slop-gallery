# vite-plugin-r3f-static-rendering

> Scaffolded workspace package. The shared proof model and feature boundaries exist; the JSX transforms are intentionally not enabled in Slop Gallery yet.

Ahead-of-time rendering optimizer for React Three Fiber. It owns optimizations that change the **render graph**, rather than serializing an individual resource.

## Package graph

```text
vite-plugin-bake-core
├─ vite-plugin-bake-three-geometry
│  ├─ BufferGeometry baking
│  ├─ collider-array baking
│  └─ MeshBVH serialization       ← feature #3 belongs here
│
├─ vite-plugin-bake-static-textures
│  └─ deterministic texture/canvas baking
│
└─ vite-plugin-r3f-static-rendering  ← new package
   ├─ shared static-render proof
   ├─ staticInstancing            ← feature #4
   └─ renderBundles               ← feature #5
```

`vite-plugin-bake-core` remains the shared source-graph/closed-expression infrastructure. The R3F compiler should reuse that machinery for imported constants and deterministic data, but it should not reuse the binary snapshot layer unless a feature actually emits a baked resource.

## Why #4 and #5 are one package

Static instancing and WebGPU render bundles both need to answer the same difficult questions:

- Is the child structure invariant for this build?
- Are transforms invariant after mount?
- Are geometry/material identities stable?
- Does an object have behavioral identity through refs or event handlers?
- Can visibility/material/children change from React state, props or imperative code?
- Are all descendants valid renderable objects for a `BundleGroup`?

That proof is represented by `StaticRenderFacts` in `./analysis`. Feature transforms consume those facts; they should not implement competing definitions of “static”.

## `staticInstancing` — feature #4

Target shape:

```tsx
{items.map(item => <mesh
  key={item.id}
  position={item.position}
  rotation={item.rotation}
>
  <boxGeometry args={[1, 2, 3]} />
  <meshStandardNodeMaterial color='#aaa' />
</mesh>)}
```

When the collection and render recipe are proven static and all instances share geometry/material identity, the compiler can lower the family to an `InstancedMesh`. If transforms are known at build time, instance matrices can be emitted directly rather than constructed through one React object per item.

The transform must decline objects with meaningful per-object interaction, refs, dynamic visibility/materials, structural children, or other identity-sensitive behavior. A conservative missed optimization costs only performance; an incorrect conversion changes application semantics.

The default scaffold threshold is three instances.

## `renderBundles` — feature #5

A proven static render-only subtree can be lowered to Three's `BundleGroup`, allowing `WebGPURenderer` to record it as a WebGPU render bundle.

`BundleGroup` requires more than merely “React does not rerender this component”. The compiler must prove a stable descendant structure and exclude unsupported descendants such as lights. Transform/material changes also matter because a static bundle will not automatically notice arbitrary application mutations.

This feature should generally run **after static instancing analysis** so the compiler can reduce draw calls first and bundle the remaining static render graph second.

The default scaffold threshold is four renderable objects.

## Ordering

The intended pipeline is:

```text
resource baking
  ↓
R3F static proof
  ↓
static instancing
  ↓
recompute subtree facts affected by the rewrite
  ↓
BundleGroup insertion
  ↓
React Compiler / ordinary bundling and minification
```

Resource baking and R3F graph optimization are deliberately separate. A `BufferGeometry` can be statically baked while the mesh using it remains dynamic; conversely an instanced family can use runtime-loaded geometry.

## API scaffold

```ts
import r3fStaticRendering from 'vite-plugin-r3f-static-rendering'

r3fStaticRendering({
  staticInstancing: {
    minimumCount: 3,
  },
  renderBundles: {
    minimumObjects: 4,
  },
})
```

Both feature blocks can be set to `false`. The package is currently private and deliberately unreferenced from Slop Gallery until transforms and semantic/browser regressions are implemented.

## Implementation direction

The analyzer should use binding provenance, not component/variable names. Imported finite data can be followed through `vite-plugin-bake-core`'s source graph. JSX-specific analysis then produces one `StaticRenderFacts` record that both transforms trust.

The package should not attempt to execute arbitrary React components. Components whose render output cannot be proven from syntax and closed data should be treated as opaque. This keeps the optimization annotation-free without making it speculative.
