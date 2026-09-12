# Knots

Each candidate owns `data.ts`, an `index.ts` forwarding its metadata and an arbitrary number of `items/{id}/` folders. Each item has `data.ts` and a default-exported material class in `material.ts`. Extend `KnotMaterial` and accept the shared environment texture in the constructor.

- Use stable snake_case IDs and a globally unique plate number. Export item data from the candidate’s index, then register new candidates in the root index.
- Keep exact model provenance in each item’s `author.model`: required `title`, optional `slug` and `effortLevel`. Candidate folders group batches and versions; plates credit the individual author.
- All non-archived items are displayed per candidate, in ascending plate-number order. The current exhibition includes every catalog entry, with no archives.
- `archived: true` hides an item regardless of highlighting without removing it from the catalog or prompt examples.
- For vertex displacement, declare its conservative maximum distance in meters as `displacement`. Geometry culling and collision bounds expand automatically; materials with equal bounds share geometry.
- Each item owns `icon.jxl`. Each candidate owns its model `icon.jxl` and its generated `overview.jxl`. Static `new URL(…, import.meta.url)` references let Vite include these assets without requiring them to exist when adding metadata.

The metadata barrels never import shaders. Vite discovers material modules automatically and constructs only the selected entries. The regular Gallery build excludes the entire Knot registry.

## Updating images

With Vite and its page open in the debug browser, run `bun scripts/updateKnots.ts`. To update only some candidates, use `bun scripts/updateKnots.ts gemini fable`. Optional `--browser-url` and `--page-url` override `http://127.0.0.1:9223` and `https://vite.tower.lan`.

The script renders all item icons on a transparent 640 × 640 canvas, including archived items, then crops to their visible alpha bounds. Each overview contains exactly the current non-archived selection in plate-number order, with four columns and enough rows. Cropped icons are centered and proportionally contained inside square tiles with 12 pixels of padding; the overview keeps its dark background. Model symbols are rasterized at 256 × 256 from the editable SVG sources in `scripts/assets/knots/{candidate}.svg`.

Regenerate after changing materials, titles or archives. Outputs are staged until the requested candidates render successfully. The script uses its own detached WebGPU renderer, validates finite HDR output and never navigates the browser or changes the live scene, camera or viewport. The gallery only loads the generated boards – it no longer composes them during startup.

Outputs are JXL by default: `cjxl --allow_expert_options --effort 11 --brotli_effort 11 --iterations 100 --keep_invisible 0 --distance 1`. PNG is only a lossless browser-to-encoder intermediate and is removed after encoding. Production Vite builds use `vite-plugin-avif-only`; development serves the JXL sources unchanged.
