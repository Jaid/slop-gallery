# Rendering pipeline

`GalleryRenderPipeline` owns the render graph and its intermediate resources. The React `Postprocessing` component only attaches it to Fiber and handles the focus lifecycle.

Quality rendering runs:

```text
current-frame scene color + depth + normals + velocity
  → ambient occlusion
  → Knot focus isolation / aperture blur / sharp foreground composite
  → bloom with the inspection background mask
  → one TRAA resolve
  → Z zoom tilt-shift and vignette
  → output color transform
```

## Focus boundary invariant

`KnotBokeh` first renders **full-resolution** background color multiplied by a binary background-coverage mask, with coverage in alpha. Both come from the same current-frame scene pass. Foreground RGB is zero before any bilinear filtering or downsampling.

The half-resolution aperture gather carries premultiplied RGB and coverage through its output. It normalizes only after full-resolution sampling, then composites over the sharp current frame. Rejected/empty samples therefore create neither a colored foreground halo nor a black upsampling outline. Zero total coverage falls back to the sharp source. Coverage is internal filter weight, not scene transparency.

Do not replace this with `sample(sceneColor) * accepted(sample(depth))`: bilinear color can already contain foreground values even when the nearest depth belongs to the background. Highlight preservation amplifies that contamination. A current-frame-only cyan-ring fixture reproduced the old fringe with no TRAA involved.

All depth-based masks are applied **before TRAA**. Applying a raw, camera-jittered depth mask over resolved color would cut away the temporal edge coverage. The focused knot retains temporal antialiasing; disabling TRAA during inspection is not necessary.

The six-bladed 64-tap aperture, proximity-dependent radius, and highlight treatment are unchanged. Only the focus textures stop rendering outside inspection. Intermediate RTTs have explicit owners; borrowed scene textures are not disposed by the focus effect.

## Native regression

With the existing browser on the Knottingham production origin:

```sh
bun test/browser/run.ts knotBokeh.ts --standalone
```

`BROWSER_TEST_ORIGIN` can select a different already-open origin. The fixture bundles its own dependencies and only creates detached canvases and renderers; it does not navigate, change focus, resize the game, simulate input, or mutate the live scene. The independent bundle can emit Three's multiple-instance warning.

Coverage includes foreground exclusion without TRAA, normalization, empty coverage, focus fades/re-entry, background highlight expansion, the complete quality pipeline with mesh/camera motion, and odd-sized target recreation. Render iterations await animation frames so frame-scoped nodes update. WebGPU readbacks retain 256-byte row padding; pixel comparisons explicitly remove it.
