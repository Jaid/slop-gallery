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

## Native regression

With the existing browser on the Knottingham production origin:

```sh
bun test/browser/run.ts knotBokeh.ts --standalone
bun test/browser/run.ts bloomStability.ts --standalone
```

`bloomStability.ts` renders a perfectly still scene of subpixel HDR filaments and specks and reports the temporal deviation of the bloom halo under TRAA and SMAA. It also compares the halo of a one-pixel firefly against a glowing speck. SMAA is the zero-jitter reference. Before bloom moved behind the resolve, TRAA halos deviated by 10.3% of their mean glow; after, by 0.1%.

`BROWSER_TEST_ORIGIN` can select a different already-open origin. The fixture bundles its own dependencies and only creates detached canvases and renderers; it does not navigate, change focus, resize the game, simulate input, or mutate the live scene. The independent bundle can emit Three's multiple-instance warning.

Coverage includes foreground exclusion without TRAA, normalization, empty coverage, focus fades/re-entry, background highlight expansion, the complete heavy pipeline with mesh/camera motion, odd-sized target recreation, and real render-submission counts for walking, zoom, V-viewing, overlap, fades and re-entry under all three AA choices. Render iterations await animation frames so frame-scoped nodes update. WebGPU readbacks retain 256-byte row padding; pixel comparisons explicitly remove it.
