# Lobby cathedral roof

The original 5.8 m roof is replaced by a semicircular barrel vault: an 8 m spring line, 8 m radius and 16 m crown over the unchanged 16 m × 40 m floor. `lobbyCeiling.ts` owns the dimensions, six bays and three chandelier positions. All geometry is local to the Lobby’s floor-level center.

## Construction

- `LobbyCeilingGeometry` owns five merged geometries: a solid plaster shell, carved ribs/coffer frames, gilding, bronze tracery and clear glass. The crown, twelve segmental clerestory windows and both rose windows are **actual apertures**. There is no opaque slab behind them.
- `vaultSector()` bends indexed boxes into solid annular sectors, transforming normals analytically and correcting winding. The roof, cross ribs, coffer borders and curved glazing share the same circular profile.
- `LobbyChandelierGeometry` owns five shared geometries for three fixed two-tier coronas. Each has 26 candles, swept arms, crystal festoons and suspension rods. The canopy meets the solid transverse rib, not a glass pane. Their lowest crystals stay above 5.7 m.
- The old lower walls, cornice, doorways and artwork coordinates stay unchanged. `rooms.lobby.height` describes the taller room, while the wall factory deliberately retains the original lower wall height. No artwork-save migration is required.
- Welded mesh colliders follow the roof, window glass, carved structure and chandelier metal. The old flat visual slab **and its collider** are omitted in `Architecture`. Room containment follows the circular profile and room-culling bounds include the new crown.

## Daylight and materials

`DaylightSkyMaterial` computes its sky entirely from view direction: a blue gradient, warm solar disk/halo and static layered noise clouds. No image, HDR panorama, model or other external asset is loaded. The camera-centered dome also surrounds the reflected view. `gallerySunDirection` is shared with the gallery’s directional light; its shadow camera covers the full raised roof and floor. Glazing does not cast opaque shadows, so sunlight enters through the modeled openings and bronze mullions cast their own shadows in heavy graphics.

The roof reuses architectural plaster, polished brass, bronze and `ClearGlassMaterial`. Clear glass retains the actual sky backdrop with Fresnel reflection and slight absorption rather than painting an emissive sky onto the roof. Three chandelier point lights replace the five old laylight lamps. They approximate the distributed candles without sharp single-source self-shadow rings. `ChandelierLightsNode` keeps these aggregate sources off the fixtures themselves, avoiding blown-out crystals and metal a few centimeters from an imaginary point source; existing global ambient/hemisphere fill still approximates indirect illumination. Fast mode keeps the same roof, clear sky view and chandeliers but omits shadows and the existing heavy-mode postprocessing/reflections.

## Cost and lifetime

The roof totals 151 164 triangles and each shared chandelier totals 54 792 triangles, for 315 540 visible model triangles across the installation. Geometry is constructed once per mounted roof, merged by material and owned by disposable lifetimes. Roof and fixture collision arrays are memoized, and all three fixtures reuse the same render geometry and collider data. The sky has no CPU animation, render target or texture lifetime to manage.

## Validation

- `bun test test/unit/lobby-ceiling.test.ts`: profile/containment, unchanged lower walls, clear apertures, sunlight visibility, normal/winding correctness, bounds, triangle budget, collision data and material construction.
- `BROWSER=/path/to/chromium bun run test:live:lobby`: build the real gallery, run detached HDR checks, capture production views and heavy → fast → heavy switching, then drop the actual player through the old ceiling elevation. Screenshots are written to `out/lobby/`.
- `test/browser/lobbyCeiling.ts` can also run independently with the browser fixture runner. It checks finite HDR output, blue sky transmission through the actual glass, the solar disk and sunlight/shade contrast through the real roof.

Clouds and the solar direction are intentionally static. This is not a weather system or a volumetric light simulation. The chandelier crystals use inexpensive faceted reflective shading rather than refracting the entire scene separately for every bead.
