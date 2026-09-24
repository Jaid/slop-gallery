# knot-materials

Procedural Three.js/WebGPU knot materials and the metadata, geometry, loading, placeholders, exhibition layout, and asset-generation tools used by Knottingham.

## Structure

```text
src/
  entries/
    abyssal_lantern/
      data.ts
      Material.ts
    ferrothorn/
      data.ts
      Material.ts
    index.ts
  candidates/
    gpt_astra/
      data.ts
      symbol.svg
      lib/
    index.ts
  lib/                    # Shared shader primitives and the material base class
  main.ts                 # Metadata-only catalogue
  types.ts
  rarities.ts             # Exhaustive, centrally curated rarity map
  createPlaceholderMaterial.ts
  ProgressiveKnotMaterials.ts
  geometry.ts
  StudioEnvironment.ts
scripts/
  makePrompt.ts
  lib/
```

Every knot lives directly in `src/entries/<id>`. Candidate folders contain attribution, shared candidate-specific utilities, and candidate/model assets—not nested knot entries. Shared shader functions live in `src/lib`; a helper used only by one candidate lives in that candidate's `lib`; a helper used only by one knot lives directly in its `Material.ts`. Materials import the narrow helper files they need. `src/lib/index.ts` also provides a barrel.

`main.ts` and the metadata barrels never import shaders. The application can inspect the catalogue without evaluating any material constructors. `materials.ts` is the Vite-specific lazy loader; the application's exhibition plugin separately collects the non-archived constructors for its production scene.

## Metadata and identity

```ts
import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_lantern',
  candidateId: 'gpt_astra',
  title: 'Abyssal Lantern',
  flavorText: 'One small beacon keeps watch at the bottom of the world.',
  placeholder: {
    color: '#4de3ff',
    shading: 'glass',
  },
  author: {
    model: {
      title: 'The actual inference model title',
    },
  },
} as const satisfies KnotData
```

IDs are globally unique snake_case strings, including archived entries. A candidate is a grouping concept, not necessarily a single model. Keep exact model provenance in `author.model`: required `title`, optional `slug` and `effortLevel`. Use `harness: 'none'` for direct API inference, the actual harness name when known, and omit it when legacy provenance is unknown.

`KnotId` is derived from the named exports of `src/entries/index.ts`; `KnotCandidateId` is derived from the candidate metadata barrel. The registry rejects invalid IDs, cross-candidate duplicate IDs, missing rarities, mismatched candidate attribution, and invalid displacement bounds. Display titles are independent of IDs. The migration preserves the existing display titles and spoken recordings; renamed IDs are listed in [migration.md](migration.md).

`accent`, `highlighted`, `sourceId`, and persisted plate numbers are no longer metadata fields. `KnotEntry.rarity` is computed from the central rarity map, not stored in each `data.ts`.

## Rarity and exhibition selection

`rarities.ts` exports `unknown = 0`, `common = 1`, `rare = 2`, `prime = 3`, and `ethereal = 4`. Its `Record<KnotId, Rarity>` requires a rating for every entry. Unrated entries are initialized as `unknown` and display no stars. The rated tiers remain unchanged; formerly highlighted entries were initialized as `rare`. The three explicitly supplied ratings are preserved: `chladni_resonance` is `ethereal`, `lichtenberg_reliquary` is `prime`, and `washi_lantern` is `common`. The earlier automatic 3/4-star assignments were removed.

Knottingham displays up to four non-archived entries per candidate and up to eight candidates by default. Entry selection prioritizes higher rarity, with ID as a deterministic tie-breaker. The selected row then runs from lower to higher rarity, putting its rarer entries at the far end. `?shots=N` changes the per-candidate entry cap; `?candidates=id,id` filters candidate rows; `?candidate_limit=N` caps the filtered, ordered candidate list. `?knot_id=id,id` switches to an exact non-archived knot whitelist: every listed knot is shown, grouped into its candidate row, without the normal shot or candidate caps. `?candidate_order=score|name` controls row order: `score` (the default) equally blends the average rarity of the candidate's six highest-rated known knots with the average rarity of all its known knots, excluding `unknown` entries; candidates with fewer than six rated knots use all rated knots for both averages, and candidates with no rated knots fall back to a score of 1.1. `name` sorts by candidate title. `?rarity_filter=` accepts a comma-separated list of rarity integers (`0`–`4`) or names (`unknown`, `common`, `rare`, `prime`, `ethereal`). The rarity filter is applied before shot and candidate limits and intersects with `knot_id` when both are present. Therefore, without candidate-selection parameters, the eight highest-scoring candidates enter the scene. `archived: true` always excludes an entry from exhibition selection, but not from the catalogue or explicit prompt/icon requests.

Knottingham alone recognizes `?rarity=true|false|edit`. The default is `true`. With `false`, both selection under the shot limit and row ordering use canonical ID order, ignoring rarity. Stars remain visible for rated entries; unknown entries have no stars. With `edit`, the initial selection/order still uses rarity, but interacting with a knot's nameplate (the existing E action) cycles 0 (unknown) → 1 → 2 → 3 → 4 → 0 (unknown). The star strip updates immediately without rebuilding the atlas shader, relocating signs, or reselecting knots mid-edit. Changes remain local to the page session; they do not write source files.

Rarity edits are intentionally session-local and emit no telemetry events. Native WebMCP exposes `dump_knots`, which returns every knot currently present in the world as an array of `{id, name, position, rarity}` records using the live edited rarity values. A curation workflow is therefore: enter `?rarity=edit` (optionally with `rarity_filter`), edit signs, call `dump_knots`, and use that dump to update `src/rarities.ts` explicitly.

Plate numbers are assigned only after final filtering. Candidate billboard composites are built at runtime from the selected entries' individual icons and current labels, so selection and numbering changes require no asset regeneration.

Displayed knots begin in showcase mode: their rigid bodies are fixed in mid-air and rotate slowly. The first Rapier contact-force event permanently releases that knot into normal dynamic physics. Showcase knots cannot be grabbed; after release they can be picked up, dropped and thrown normally, and temporary fixed-body states while carrying them never restore showcase rotation.

## Material and placeholder contract

Each `Material.ts` default-exports an anonymous class extending `KnotMaterial` from `../../lib/KnotMaterial.ts`. Its synchronous constructor accepts the caller-owned environment `Texture`, calls `super(environment[, intensity])`, and sets `this.name = knotData.id`. Never dispose the supplied environment in an individual material.

For vertex displacement, metadata must declare a conservative maximum distance in meters as `displacement`. Culling and collision geometry expand accordingly, and entries with equal bounds share geometry. The global `knotCurve` and `knotFrame` helpers match the exhibition's torus-knot centerline and tube frame.

Placeholders use the entry's exact `placeholder.color`. The seven shading options are `smooth`, `ghost`, `metal`, `glass`, `stone`, `liquid`, and `fabric`. The intended spelling is `smooth`.

`createPlaceholderMaterial` provides lit surfaces without loading any entry shader. Quality mode adds physical glass transmission, fabric sheen, and liquid clearcoat where appropriate. Performance mode stays on cheaper standard lit materials; its glass is tinted transparency rather than a transmission pass. Ghosts remain visibly translucent. `ProgressiveKnotMaterials.placeholderMaterials` owns these fallback surfaces and replaces them with warmed-up full materials in quality mode. Performance mode never constructs full entry materials. Resource disposal waits for pending compilation to settle before releasing geometry or textures.

## Generate an inference prompt

From the repository root:

```sh
bun packages/knot-materials/scripts/makePrompt.ts --candidate claude_opus --count 8 --output temp/opus-knots.md
bun packages/knot-materials/scripts/makePrompt.ts --examples 4 --seed another-batch
bun packages/knot-materials/scripts/makePrompt.ts --example-ids ferrothorn,washi_lantern,coralline_crown --output temp/knot-prompt.md
```

The script outputs Markdown to stdout unless `--output` is supplied. It reads the current catalogue, reserves every existing ID, follows the explicit authoring API in `src/lib/index.ts` plus the selected candidate’s `src/candidates/<id>/lib/index.ts`, and includes the complete contents of every statically imported or re-exported local dependency. This includes candidate helpers that none of the examples happen to use. Unexported files, icon-generation utilities, unrelated candidate APIs, and application infrastructure are not included merely because they live in a library folder. Third-party implementation sources and catalogue-derived type-only ID registries are not expanded. Actual `data.ts`/`Material.ts` examples include their own transitive dependencies in a separate example-only section; another candidate’s helper or another knot’s material-local helpers is not an allowed import for a new entry. Default sampling is deterministic for a given seed and favors different candidates and placeholder families. Explicit examples can include archived entries. Paths are resolved from the script, so it also works from another working directory.

The generated prompt asks for individual entry files, accurate provenance, placeholder metadata, flavor text, displacement bounds, metadata exports, and `unknown` rarity additions pending curation. It does not call an inference provider, incur inference charges, or write new knot entries itself.

Expose new reusable shader helpers through the appropriate shared or candidate `lib/index.ts` so they are automatically available to future inference prompts.

After accepting a submission, add its metadata export to `src/entries/index.ts` and an initial `unknown` rating to `src/rarities.ts`. Add a candidate metadata module and barrel export only when introducing a genuinely new candidate; register its row in `main.ts` as well. Then typecheck, test, and use the application's voice tooling for its title recording.

## Runtime billboard previews

Knot billboard thumbnails are not persisted as image assets. Knottingham renders the currently selected entries at runtime with one shared detached WebGPU renderer, reads the offscreen render target back into tightly cropped canvases, and composes those canvases into a fixed 3:2 texture for each shared-size billboard. The texture packer chooses a compact row/column layout for the current entry count and centers shorter rows toward the middle. Each billboard face and its timber stand are separate, unattached rigid bodies. The sign simply rests on the stand's feet, while the rear posts and cross-braces form one movable timber stand. The cross makes a rear hit harder to aim, but the unattached sign can still be knocked flat while direct impacts can shift the heavier stand. Quality mode uses the real knot materials; performance mode screenshots the same cheap placeholder materials shown by the exhibition, so preview generation does not defeat the performance-mode shader policy.

Candidate signs and labels use each candidate's `symbol.svg` directly. There are therefore no checked-in `icon.jxl` files and no icon-regeneration step when materials, symbols, titles, rarity, selection, or numbering change.

## Render a knot inspection set

From `packages/knot-materials`:

```sh
bun scripts/renderKnot.ts iris_steel
bun scripts/renderKnot.ts iris_steel --category snapshot
bun scripts/renderKnot.ts iris_steel --category animation,video
```

`--category` accepts `snapshot`, `animation`, `video`, or any comma-separated combination. It defaults to `snapshot,animation,video`. `snapshot` covers the angle stills, camera-distance stills, and a widescreen close-up, `animation` covers the animated angle loop, and `video` covers `animation.webm`. Snapshots and the animated angle loop use JPEG XL. Partial runs preserve already-rendered files from unselected categories.

By default the command writes `out/render/<id>` with three 2048 × 2048 angle JXLs (`angle_0.jxl`, `angle_45.jxl`, and `angle_90.jxl`), one 3840 × 2160 `closeup.jxl` at 0.5× distance and a 25° FOV, one 120-frame 512 × 512 `angles.animated.jxl` orbit, two 2048 × 2048 camera-distance JXLs (`distance_near.jxl` at 0.75× and `distance_far.jxl` at 1.8×), and one 960-frame 1024 × 1024 `animation.webm`. The animated JXL uses JPEG XL distance 4.

The combined 16-second video is phase-shifted so frame 0 is the least noticeable loop seam: the knot is distant, exactly side-on, and material/shader time starts at zero. The first 0.5 seconds finish the distant hold, 0.5–2.5 seconds return to normal, 2.5–4.5 hold normal, 4.5–6.5 zoom extremely close, 6.5–8.5 hold close, 8.5–10.5 return to normal, 10.5–12.5 hold normal, 12.5–14.5 move out, and 14.5–16 finish the distant hold. The 50° base FOV widens modestly for the near/far distance stills and animated distance extremes so more of the knot remains visible; the close-up instead locks a narrow 25° FOV. Preview rendering uses 2× supersampling plus 4× MSAA, then high-quality downsampling to the final 512 px animated image, 1024 px inspection video, or 2048 px square still. The close-up combines the nearest inspection distance with a 25° FOV, and its native 3840 × 2160 target keeps 4× MSAA without an extra supersampling pass. It completes one full Y-axis turn every two seconds, with eased rotation so broad views linger while side-on views pass faster.

The command owns its Vite server, browser, offscreen renderer, temporary PNG frames and image/video encoding. Candidates only need the single command above.

## Generate an animated icon

```sh
bun packages/knot-materials/scripts/makeAnimatedIcon.ts opal_fire
bun packages/knot-materials/scripts/makeAnimatedIcon.ts ferrothorn --output temp/ferrothorn.animated.webm
```

The default output is `src/entries/<id>/icon.animated.webm`; runtime billboard previews are unaffected. It renders exactly 120 640 × 640 source frames over two seconds, making one full Y-axis rotation. It samples 0° through 357° in 3° increments, without duplicating 360° at the loop seam. A private renderer clock advances material animation at the corresponding 60 Hz sample times. The camera and image bounds remain fixed for the entire animation, with displacement-aware framing; individual frames are never cropped independently.

Capture uses explicit offscreen GPU readback, including HDR-finiteness checks. The script uses the same self-contained private renderer by default and accepts optional `--browser-url` and `--page-url` overrides.

Encoding requires `ffmpeg` with `libsvtav1`. The numbered PNG frames are encoded directly to 8-bit full-range 4:2:0 AV1 in a WebM container using SVT-AV1 preset 5 at CRF 20, variance boost enabled, film grain disabled, tune 0 (VQ), and explicit 8-bit input depth; there is no APNG intermediate. AV1 does not preserve the source alpha channel in this pipeline, so the experimental WebM output is opaque. Looping is a playback concern (for example, HTML `<video loop>`) rather than embedded animation metadata. All temporary frames stay outside the repository and are removed on completion or failure. The destination is replaced atomically only after capture and encoding finish.

## Narration

Knottingham announcements are generated through `vite-plugin-import-voice-sample` virtual imports rather than checked-in audio files.

`src/announcementAssets.ts` contains one static Iris import for every candidate, model, and knot title in `knotAnnouncements(knotCandidates)`. Each import uses loud delivery and Opus output, while the existing announcement path IDs remain unchanged for `KnotNarration`.

There are no per-knot announcement audio assets in this package. Adding catalogue entries therefore only requires keeping the announcement import inventory in sync; runtime playback never initiates speech generation.

## Validation

```sh
bun --cwd packages/knot-materials test
bun run typecheck
bun test --max-concurrency 1 test/unit/knot-candidates.test.ts test/unit/knot-exhibition.test.ts test/unit/knot-cellular-fields.test.ts test/unit/progressive-knot-materials.test.ts
```

Package tests cover metadata and folder parity, unique IDs and flavor text, exhaustive rarities, helper ownership, independent material construction, metadata-only bundling, all placeholder presets, complete prompt source inclusion, deterministic sampling, CLI output from another working directory, and the absence of persisted billboard rasters.