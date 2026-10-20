# Dine banquet

`layout.ts` is the shared source for the furniture, place settings and floor-plan markers. All geometry is authored in meters around the middle of Dine’s floor, with the table’s long axis along z. `DineTable` supplies the room translation once.

- **Table:** 14.4 m × 2.4 m, top at 82 cm, with a beveled walnut board, cross-grained breadboard ends, brass stringing and three paired turned trestles. Low stretchers tie the bases together.
- **Seating:** eight arched chairs on each side and one at each end. Their backs leave more than 3.8 m to every wall. The existing Dine visit pose stays clear. The chairs render in three instanced draws, sharing one geometry per material.
- **Service:** eighteen porcelain plates on gilt chargers, folded blue napkins, hollow goblets and steel cutlery. Three five-candle candelabras alternate with two covered porcelain tureens on an ivory runner. Flames are emissive meshes, not additional room lights or shadow passes.
- **Materials:** the existing attribute-driven `WalnutMaterial`, `PolishedBrassMaterial` and borrowed page-lifetime satin steel, plus locally owned porcelain, wax, emissive flame and filtered procedural textiles. No new image assets or texture downloads. Fine textile relief fades before becoming subpixel. Grain is assigned to each wooden part before merging, so it follows the joinery.
- **Physics:** fixed welded surface colliders follow the wooden table, chair frames/cushions and substantial tableware. They preserve the openings between legs and under the top. The furnishings are not grabbable and do not add saved state. Tiny trim, cutlery, napkins, candle wax and flames do not get separate colliders.
- **Ownership:** geometry and locally owned materials use `useDisposable`; material props are borrowed by the meshes. Fiber disposes the instanced mesh buffers on unmount. The shared steel is never disposed by this component.

The full banquet is about 103 000 triangles, including all eighteen chairs, in twelve visible draws before shadow/reflection passes. Heavy and fast graphics share the same model and materials; the gallery’s existing pipeline controls reflections, bloom and antialiasing.

## Validation

```sh
bun test test/unit/dine-table.test.ts
bun run test:live:dine
```

The unit tests cover finite geometry and normals, bounds and triangle budget, grain mapping, all eighteen settings, perimeter/visit clearance, disposal and physical tabletop/seat hits. A dropped rigid ball lands on the board. The production smoke test walks through both doorways and all four aisles, verifies that the end chair blocks the player and drops the player onto the tabletop. It uses `LIVE_TARGET` to select an existing build when run directly with `LIVE_TEST=true bun test test/dine.live.test.ts`.
