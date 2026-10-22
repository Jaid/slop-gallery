# Lobby fountain

A carved-limestone tazza fountain sized for the vaulted Lobby: an octagonal molded basin, two melon-fluted bowls on balusters and restrained bronze fillets. The bowls brim at 1.94 m and 2.96 m; the central bubbler reaches roughly 3.6 m. Position and outer footprint are unchanged, so the existing approaches, benches, map marker and glass-floor clearance remain valid.

## Geometry and ownership

- `CarvedProfileGeometry` deforms the existing revolved profiles with radial fluting and shallow spill saddles. Its inverse-transpose normals preserve the molding creases. The raised banks hold back water between the twelve lower and eight upper spills.
- Pool boundaries intersect the same carved cross sections at water height instead of drawing discs through the raised lips. The falling ribbons follow ballistic paths, narrow as they fall and leave the stonework visible. Six small parabolic crown jets surround the central bubbler.
- The hollow stone mesh is also the fixed trimesh collider, with internal-edge correction. Water, mosaic and bronze fillets do not add colliders. The submerged mosaic is 2 mm above the stone floor.
- `Fountain` owns geometry, spray and materials through `useDisposable`; collision data is memoized. Graphics changes replace only the water materials. The group disables Fiber’s automatic disposal, avoiding competing resource owners.

### Triangle budget

Model triangles, before mirrored views or shadow passes:

| Part | Triangles |
|---|---:|
| Carved stone | 7168 |
| Bronze | 1344 |
| Mosaic floor | 8 |
| Three pools | 168 |
| Spill ribbons, crown jets and bubbler | 1056 |
| Static total | 9744 |
| 144 instanced droplets × 20 | 2880 |
| **Entire fountain** | **12 624** |

Tests cap static geometry at 10 000 triangles and the complete fountain at 13 000. This spends more geometry than the previous plain tazze, with explicit limits for the complete effect rather than just the stone. Solids merge by material; all falling water shares one mesh and the spray is one instanced draw. No per-frame CPU particle updates or allocations are needed.

## Water and materials

`FountainWaterMaterial` uses water’s dielectric IOR (1.333), animated surface-gradient normals, distance-filtered ripples and localized aeration at spill landings. Unlike `bumpMap`, the shared `heightNormal` helper differentiates arbitrary procedural heights. Spill UV v stores flight age, letting streaks travel with the flow; crown tubes convert arc-length UVs back to ballistic time.

Heavy mode uses physical transmission with absorption, shallow refraction and reduced transmission through foam. Fast mode retains animated normals, reflections and foam but **has no transmission node or transmission feature**. Pool vertex displacement stays small; most detail is per pixel. The jade mosaic has procedural grout, a compass border and bounded moving caustic-like brightness, not simulated caustic lighting.

`FountainEnvironment` is a small, static HDR texture generated from a skylit hall with broad arcade and glazing shapes. It supplies view-dependent PBR pseudo-reflections without a reflection capture. It is **not a reflection of the actual Lobby, nearby artwork or people**. The texture is borrowed by water and bronze and lives for the page lifetime; material disposal must not dispose it. Physical transmission still uses Three’s normal backdrop pass in heavy mode.

`FountainSpray` keeps deterministic GPU ballistics. Droplets rise from the bubbler and the actual spill landings, not a continuous ring of unrelated beads. Drops grow and shrink at their endpoints. There is no fluid solver, volumetric mist, buoyancy or water collision.

## Validation

```sh
bun test test/unit/fountain.test.ts test/unit/fountain-carving.test.ts
BROWSER_TEST_ORIGIN=http://localhost/ bun test/browser/run.ts fountain.ts --standalone
```

The browser command targets an already-open page in the browser companion, using the existing standalone fixture runner. It owns detached canvases/renderers and does not modify the live gallery. It checks actual fountain geometry and shaders in HDR, multiple viewpoints, animation, the visible contribution of ripple normals and heavy → fast → heavy replacement. Unit coverage includes winding, closed surfaces, fitted pools, open space between streams, polygon budgets, collision agreement, droplet containment and borrowed radiance lifetime.
