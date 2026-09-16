# vite-plugin-bake-core

Shared infrastructure for annotation-free Vite resource compilers. The user-facing plugins are `vite-plugin-bake-three-geometry` and `vite-plugin-bake-static-textures`.

## Separation of responsibilities

- `SourceGraph` parses source, resolves lexical/import bindings and follows re-exports. It does not import application modules into the build process.
- `Recipe` slices referenced declarations, rejects unsupported capabilities, guards captured state and evaluates the resulting closed expression in a bounded JavaScript VM. TypeScript is erased with Babel; actual approved library algorithms do the work.
- `SnapshotWriter` serializes supported owned object graphs with exact binary buffers, reference identity, supported prototypes and explicit native allocation recipes.
- The Vite plugin discovers definition/call boundaries, performs replacements, emits content-addressed assets, supplies source maps, tracks watch dependencies and removes unused assets.
- The dependency-free browser runtime fetches/decompresses each retained snapshot once and returns synchronous factories that reconstruct fresh resource graphs.

`./three` contains the reusable Three capability/type adapter. Optional CSG support is imported lazily. `./runtime` contains no Vite, Babel, Node, Three or canvas implementation imports.

## Adapter API

```ts
import createBakePlugin, {type BakeAdapter} from 'vite-plugin-bake-core'

const adapter: BakeAdapter = {
  name: 'my-resources',
  modules: new Map([
    ['my-resource-library', {Resource}],
  ]),
  roots: new Set([Resource]),
  types: [{
    name: 'Resource',
    module: 'my-resource-library',
    prototype: Resource.prototype,
    resource: 'example',
  }],
  accepts: kinds => kinds.has('example'),
}

export default () => createBakePlugin(adapter)
```

Each native type names its runtime import and prototype. `allocate` can name a registered no-argument native constructor, and `allocationArguments` supplies explicit initialization arguments when native identity/internal setup requires them. `omit` names properties generated afresh by that allocation, such as native IDs and UUIDs. Unlisted properties are serialized only when supported by the object-graph format. `readCanvas` is an optional build-only raster adapter; `loadModule` can lazily provide an optional approved native module.

Adapters are a **trust boundary**: approving a module/function permits its native implementation to run. They must not advertise nondeterministic or externally side-effecting APIs as deterministic capabilities. The VM is a bounded evaluation tool, not a security sandbox for untrusted repository code.

## Conservative behavior

The compiler supports ordinary constants, local algorithms, helpers and approved library operations. Mutable bindings, observed captured-state writes, stateful captured closures, captured resource aliases, clocks, unseeded randomness, unknown globals/imports, async execution, accessors, private class fields and unsupported serialized values cause a candidate to remain unchanged.

This is not whole-program alias analysis or a proof that arbitrary user code is pure. It assumes unmodified platform/library intrinsics and normal resource ownership. Cross-module mutation through unrelated escape paths is outside the supported model. Call sites with genuinely open inputs remain runtime work; the compiler does not execute React components to guess their inputs.

Resource instances are never pooled across calls. The format preserves cycles, Maps/Sets, null prototypes, special numeric values and multiple views of the same owned ArrayBuffer. Arrays with holes/custom properties, shared-memory buffers, function-valued instance properties and unsupported descriptors/prototypes are refused rather than approximately serialized.

## Build and transport behavior

Snapshots use a small JSON graph header followed by binary buffer payloads. Gzip is a transport choice, not image conversion or numeric quantization. The default browser path requires ES-module top-level await, fetch and DecompressionStream; disabling `compress` removes the last requirement.

Each plugin instance has separate build state. Watch builds start fresh, and referenced source/re-export files are watched. Artifacts deduplicate by content hash and can be cached by the serving infrastructure. There is no persistent evaluation cache.

`bake-<adapter-name>.json` is enabled by default and contains relative source paths and truncated source expressions, not just aggregate counts. Set `report: false` when publishing those diagnostics is undesirable, and consume `onDiagnostic` during the build instead.

The timeout bounds JavaScript execution of a recipe; it is not a memory sandbox or a reliable interruption boundary for every native library call. Artifact and canvas size limits constrain supported outputs, not all possible temporary allocations inside trusted native code.

## Tests

```sh
bun test ./packages/vite-plugin-bake-core/test
```

Compiler tests exercise binding identity, re-exports, TypeScript, captured-state rejection, timeout handling and snapshot identity. The two resource packages supply format-specific and real Vite integration regressions.
