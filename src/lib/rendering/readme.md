# Rendering pipeline

`GalleryRenderPipeline` owns the render graph and its intermediate resources. The React `Postprocessing` component only attaches it to Fiber and handles the focus lifecycle.

Quality rendering runs:

```text
current-frame scene color + depth + normals + velocity
  → ambient occlusion
  → Knot focus isolation / aperture blur / sharp foreground composite
  → inspection background mask packed into alpha
  → one antialiasing resolve (TRAA, SMAA or none)
  → bloom from the resolved color, masked by the resolved alpha
  → Z zoom tilt-shift and vignette
  → output color transform
```

## Antialiasing

`?anti_aliasing` picks the resolve: `traa`, `smaa` or `false`. Without it, heavy graphics use TRAA and fast graphics use none. The renderer has `antialias: false` and the scene pass is single-sampled for GTAO, so these are the only antialiasing paths.

- `traa` is temporal. It jitters the camera, needs the velocity MRT and calms shimmering materials such as `bismuth_staircase` and `magnetite_field`.
- `smaa` (1× medium, color edges) is a current-frame filter: no ghosting or camera jitter, but no subpixel stability either.

Both run on linear color before the output transform. Any choice other than `false` in fast graphics mounts a light pipeline (scene pass and the resolve only, no knot focus or other heavy effects) that renders every frame.

## Wireframe

`?show_wireframe` replaces the whole pipeline with the hidden-line `WireframeRenderPipeline` from `capture-session`. A bare `?show_wireframe` or `true` draws the classic 1 px hardware lines over a depth-writing fill, unsmoothed. A positive integer instead draws antialiased edges as part of the fill, that many hundredths of a pixel wide in total (`?show_wireframe=100` is 1 px, `50` matches `set_wireframe`’s default), from each fragment’s distance to its triangle’s edges.

## Albedo

`?albedo` replaces the whole pipeline with `AlbedoRenderPipeline`: one 4× multisampled scene pass whose context swaps every material’s result for its diffuse color, so each surface shows its base color, maps, vertex colors and opacity as if evenly lit from all sides at full strength. Lights, shadows (their maps don’t render at all), the environment, emission, fog, tone mapping, exposure and every postprocessing effect leave no trace; only the conversion to the output color space remains. Glass that refracts its backdrop itself (cast floor, vault and crown glass) is opaque and brings the view through it in as emission; it declares `emissionIsTransmission`, so it keeps that view, which then shows the albedo behind it. `?show_wireframe` takes precedence over it.

## Bloom

Bloom reads the antialiased image, never the jittered scene pass. Its luminance threshold has a 0.01 knee and its first downsample is half resolution, so subpixel HDR features (flames, sparkles, thin emissive veins) that TRAA's jitter moves across pixel centers switch whole halos on and off. Those halos are smooth, so TRAA's variance clipping clamps their history to the current frame and cannot average the flicker away. Feeding bloom the resolved image keeps a still scene's halo still, and thin features bloom by their real pixel coverage instead of jitter-inflated peaks.

The inspection mask (glow is suppressed over the defocused background) is still computed before TRAA: alpha carries it through the resolve, so its edge is temporally antialiased. TRAA's resolve material is opaque by default, which would force alpha to 1, so the pipeline sets it to `NoBlending`. TRAA clips only RGB history, so the resolved mask is additionally clamped by the current mask dilated by about 2 px; stale history can then never put glow back onto distant background after focus changes.

The canvas is opaque (`alpha: false`), so this alpha channel is free.

Each pixel feeds bloom at most luminance 8. Sharp specular highlights (clearcoat at roughness 0.015, high-exponent glints) reach hundreds on a single pixel, and as a knot rotates they land on and leave pixel centers frame by frame. Uncapped, each one flashed a halo far larger than any intended glow source, which read as heavy flicker even without antialiasing jitter. Intended sources such as the chandelier flames peak around 4 and are unaffected.

## Focus boundary invariant

`KnotBokeh` first renders **full-resolution** background color multiplied by a binary background-coverage mask, with coverage in alpha. Both come from the same current-frame scene pass. Foreground RGB is zero before any bilinear filtering or downsampling.

The full-resolution aperture gather carries premultiplied RGB and coverage through its output. It normalizes only after full-resolution sampling, then composites over the sharp current frame. Rejected/empty samples therefore create neither a colored foreground halo nor a black upsampling outline. Zero total coverage falls back to the sharp source. Coverage is internal filter weight, not scene transparency.

Do not replace this with `sample(sceneColor) * accepted(sample(depth))`: bilinear color can already contain foreground values even when the nearest depth belongs to the background. Highlight preservation amplifies that contamination. A current-frame-only cyan-ring fixture reproduced the old fringe with no TRAA involved.

All depth-based masks are applied **before TRAA**. Applying a raw, camera-jittered depth mask over resolved color would cut away the temporal edge coverage. The focused knot retains temporal antialiasing; disabling TRAA during inspection is not necessary.

The six-bladed 64-tap aperture, proximity-dependent radius, and highlight treatment are unchanged. The focus textures render only while V-viewing (including fades). Zoom’s two Gaussian passes render only while zoom is nonzero (including fades); without AA, its source RTT is also gated. Walking runs neither camera-blur branch. Bloom and the floor reflection’s mipmap roughness filtering are not camera blur. Floor reflections use native resolution (scale 1). Intermediate RTTs have explicit owners; borrowed scene textures are not disposed by the focus effect.

## Frame work

`GalleryRenderer` treats the Fiber scene as the frame scene. Every shadow face and the floor reflection render that scene again, so per-frame work is kept to once per frame:

- Scene matrices update before the first pass of a frame. Later passes reuse them.
- Point, spot and directional shadow maps update once per frame, not once per camera (patched `ShadowNode`). Without it, each reflection re-rendered every shadow map.
- In the gallery, `ShadowCache` keeps each shadow map until a shadow caster in its light’s reach moves, appears or disappears, or the light moves. Lights in rooms the camera can't see keep a pending update until their room is in view or their reach meets the view, like the Exhibition's green tunnel lamp shining up through the Lobby's floor.
- All reflective floors of a world share one reflection (`FloorMaterial`), so the scene is mirrored once per frame. The gallery mirrors the Moonfall’s slate 8 m down while the player is in the Moonfall or the Oculus and the upper floors everywhere else; floors at the other height show their plain surface meanwhile. All of these floors hide while it renders, since a pass that samples its own target fails WebGPU validation.
- Render pipelines of the frame scene compile with `createRenderPipelineAsync`. An object is drawn once its pipeline is ready, so a new variant no longer blocks the GPU process for seconds. The patched `WebGPUPipelineUtils` closes each pipeline’s error scope before awaiting it; otherwise any later device error lands in that scope and three never draws the pipeline’s objects. Render bundles keep synchronous pipelines, since they record their draws once.
- Behind the loading screen, every object is drawn in every pass regardless of the camera frustum, as many new ones per frame as fit in about 50 ms of building, except in the gallery’s rooms other than the start room, which `RoomCulling` leaves out meanwhile. The floor reflection is skipped too: its pipelines are mostly the scene pass’s, so it would only add building that the streaming after loading spreads over frames anyway. The loading screen only waits until each of these objects has been drawn once and the rooms the camera starts in have mounted: artworks still decoding and the last pipelines, which compile one after another at about a second each, appear once they are done. Pipelines that take 500 ms or more log a `pipeline.slow` telemetry event. With `?telemetry=true`, `loading.progress` events log pending pipelines, artworks and the warmup’s frames, objects and build time every second, and `loading.finished` logs when each of them was done.
- Afterward the renderer streams in what is left: it builds objects that a pass hasn’t drawn yet for `?stream_budget` milliseconds per frame, 8 by default (`false`, the default under `?test=true`, builds them all in the first frame, so every pipeline compiles in parallel and the scene is complete about three times sooner, after a freeze of a few seconds), guessing each object’s cost from what its material took in another pass, or else from what new materials recently took in the same pass, and leaves the rest out until their turn: first the objects in the camera’s rooms and the rooms related to them in `relations.ts`, then everything else. The gallery’s rooms, apart from the Lobby and the rooms the camera starts in, only download as chunks of their own once Enter is enabled, and `World` mounts them one per frame, nearest first; the loading screen and the voxel GI wait for the rooms they asked for. A shadow map that left objects out renders again, one map per frame in turn, until it has drawn them all; the shadow cache alone would keep it as it is.
- In the gallery, `RoomCulling` leaves out rooms that the camera can’t see through an opening (up to two deep) from all passes but the sun’s shadow map, and freezes the shadow maps of lights in those rooms whose reach misses the view. The sun falls through openings that rooms out of sight frame, so dropping them from its shadow map would reshape the sunlight in the rooms in sight. An object belongs to every room its bounds reach into, so a shared wall drops out once neither of its rooms is in sight. A room behind an opening only shows through the part of the screen the opening covers: its objects outside that part drop out of the camera and its floor reflection, but keep casting shadows.
- Decor made of many fixed pieces (stairs, railings, floors, wainscots, skylights) sits in a `StaticBatch`, which merges pieces that shade alike into one mesh after mounting. Draw calls dominate the frame cost, so this saves 20–35% of them per view; the originals stay in the scene for colliders but stop rendering.

## Native regression

With the existing browser on the Knottingham production origin:

```sh
bun test/browser/run.ts knotBokeh.ts --standalone
bun test/browser/run.ts bloomStability.ts --standalone
```

`bloomStability.ts` renders a perfectly still scene of subpixel HDR filaments and specks and reports the temporal deviation of the bloom halo under TRAA and SMAA. It also compares the halo of a one-pixel firefly against a glowing speck. SMAA is the zero-jitter reference. Before bloom moved behind the resolve, TRAA halos deviated by 10.3% of their mean glow; after, by 0.1%.

`BROWSER_TEST_ORIGIN` can select a different already-open origin. The fixture bundles its own dependencies and only creates detached canvases and renderers; it does not navigate, change focus, resize the game, simulate input, or mutate the live scene. The independent bundle can emit Three's multiple-instance warning.

Coverage includes foreground exclusion without TRAA, normalization, empty coverage, focus fades/re-entry, background highlight expansion, the complete heavy pipeline with mesh/camera motion, odd-sized target recreation, and real render-submission counts for walking, zoom, V-viewing, overlap, fades and re-entry under all three AA choices. Render iterations await animation frames so frame-scoped nodes update. WebGPU readbacks retain 256-byte row padding; pixel comparisons explicitly remove it.
