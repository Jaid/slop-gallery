# knot-materials

Procedural Three.js/WebGPU knot materials and the metadata, geometry, loading, placeholders, exhibition layout, and asset-generation tools used by Knottingham.

## Structure

```text
src/
  entries/
    abyssal_lantern/
      data.ts
      Material.ts
      icon.jxl
      announce.opus
    ferrothorn/
      data.ts
      Material.ts
      util.ts
      icon.jxl
      announce.opus
    index.ts
  candidates/
    gpt_astra/
      data.ts
      icon.jxl
      symbol.svg
      lib/
      candidate/announce.opus
      slug/<model-slug>/announce.opus
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
  makeIcon.ts
  updateIcons.ts
  lib/
```

Every knot lives directly in `src/entries/<id>`. Candidate folders contain attribution, shared candidate-specific utilities, and candidate/model assets—not nested knot entries. Shared shader functions live in `src/lib`; a helper used only by one candidate lives in that candidate's `lib`; a helper used only by one knot lives beside its material in `util.ts`. Materials import the narrow helper files they need. `src/lib/index.ts` also provides a barrel.

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
  icon: new URL('icon.jxl', import.meta.url).href,
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

`rarities.ts` exports `common = 1`, `rare = 2`, `prime = 3`, and `ethereal = 4`. Its `Record<KnotId, Rarity>` requires a rating for every entry. Unrated entries are initialized as `common`; formerly highlighted entries are initialized as `rare`. The three explicitly supplied ratings are preserved: `chladni_resonance` is `ethereal`, `lichtenberg_reliquary` is `prime`, and `washi_lantern` is `common`. The earlier automatic 3/4-star assignments were removed.

Knottingham displays up to four non-archived entries per candidate and up to eight candidates by default. Entry selection prioritizes higher rarity, with ID as a deterministic tie-breaker. The selected row then runs from lower to higher rarity, putting its rarer entries at the far end. `?shots=N` changes the per-candidate entry cap; `?candidates=id,id` filters candidate rows; `?candidate_limit=N` caps the filtered, ordered candidate list. `?knot_id=id,id` switches to an exact non-archived knot whitelist: every listed knot is shown, grouped into its candidate row, without the normal shot or candidate caps. `?candidate_order=score|name` controls row order: `score` (the default) sorts by descending average knot rarity, while `name` sorts by candidate title. Therefore, without candidate-selection parameters, the eight highest-scoring candidates enter the scene. `archived: true` always excludes an entry from exhibition selection, but not from the catalogue or explicit prompt/icon requests.

Knottingham alone recognizes `?rarity=true|false|edit`. The default is `true`. With `false`, both selection under the shot limit and row ordering use canonical ID order, ignoring rarity. Stars remain visible. With `edit`, the initial selection/order still uses rarity, but interacting with a knot's nameplate (the existing E action) cycles 1 → 2 → 3 → 4 → 1. The star strip updates immediately without rebuilding the atlas shader, relocating signs, or reselecting knots mid-edit. Changes remain local to the page session; they do not write source files.

Each edit emits a `knot.rarity.changed` log and trace through the application's Victoria client and same-origin relay. Records include `knot.id`, `knot.candidate.id`, `rarity.baseline`, `rarity.previous`, `rarity.value`, and `edit.sequence`, with the telemetry session ID and timestamp. The UI says “telemetry queued,” not “saved”: `victoria-browser-client` owns the bounded retrying delivery queue. When telemetry is disabled, editing is rejected with a visible explanation instead of silently losing the decision. Enable telemetry and provide its relay before editing.

Retrieve real choices from VictoriaLogs with:

```text
service.name:=knottingham event.name:=knot.rarity.changed _time:7d
| sort by(_time desc)
```

For each `knot.id`, use its newest real edit's `rarity.value` when applying choices to `src/rarities.ts`; the baseline and previous values support review. Synthetic relay checks use the separate `knottingham-rarity-test` service and are excluded by that query.

Plate numbers are assigned only after final filtering. Candidate billboard composites are built at runtime from the selected entries' individual icons and current labels, so selection and numbering changes require no asset regeneration.

## Material and placeholder contract

Each `Material.ts` default-exports a class extending `KnotMaterial` from `../../lib/KnotMaterial.ts`. Its synchronous constructor accepts the caller-owned environment `Texture`, calls `super(environment[, intensity])`, and sets `this.name = knotData.id`. Never dispose the supplied environment in an individual material.

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

The script outputs Markdown to stdout unless `--output` is supplied. It reads the current catalogue, reserves every existing ID, follows the explicit authoring API in `src/lib/index.ts` plus the selected candidate’s `src/candidates/<id>/lib/index.ts`, and includes the complete contents of every statically imported or re-exported local dependency. This includes candidate helpers that none of the examples happen to use. Unexported files, icon-generation utilities, unrelated candidate APIs, and application infrastructure are not included merely because they live in a library folder. Third-party implementation sources and catalogue-derived type-only ID registries are not expanded. Actual `data.ts`/`Material.ts` examples include their own transitive dependencies in a separate example-only section; another candidate’s helper or another knot’s `util.ts` is not an allowed import for a new entry. Default sampling is deterministic for a given seed and favors different candidates and placeholder families. Explicit examples can include archived entries. Paths are resolved from the script, so it also works from another working directory.

The generated prompt asks for individual entry files, accurate provenance, placeholder metadata, flavor text, displacement bounds, metadata exports, and `common` rarity additions pending curation. It does not call an inference provider, incur inference charges, or write new knot entries itself.

Expose new reusable shader helpers through the appropriate shared or candidate `lib/index.ts` so they are automatically available to future inference prompts.

After accepting a submission, add its metadata export to `src/entries/index.ts` and a rating to `src/rarities.ts`. Add a candidate metadata module and barrel export only when introducing a genuinely new candidate; register its row in `main.ts` as well. Then typecheck, test, generate its icon, and use the application's voice tooling for its title recording.

## Generate icons

Open the Vite application in the debug browser first. From the repository root:

```sh
bun packages/knot-materials/scripts/makeIcon.ts abyssal_lantern
bun packages/knot-materials/scripts/makeIcon.ts ferrothorn --output temp/ferrothorn.jxl
bun packages/knot-materials/scripts/updateIcons.ts gemini_flash claude_fable
```

`makeIcon.ts` renders one canonical ID, including archived entries. Its default destination is that entry's `icon.jxl`; `--output` permits a separate JXL destination. `updateIcons.ts` updates all entries and the candidate symbol for the requested candidates, or all candidates when none are specified. The root `bun scripts/updateKnots.ts` command remains a forwarding entry point.

By default the icon scripts start their own private Vite server and Chrome instance, so no browser or dev server needs to be prepared first. Passing `--browser-url` (and optionally `--page-url`) instead attaches to an existing debug browser. Rendering uses a detached WebGPU scene and validates finite HDR pixels before publishing images.

Knot icons are rendered at 640 × 640 and cropped to visible alpha bounds. Candidate symbols are rendered at 256 × 256 from `src/candidates/<id>/symbol.svg`. PNG is an intermediate only. Encoding requires `cjxl`; ImageMagick is also required when converting an unsupported encoder input format. Lossy JXL encoding follows the project standard: effort 10, Brotli effort 11, and distance 1.

All requested outputs render and encode in temporary storage before publishing. Each destination is replaced through a same-volume atomic rename; temporary files are cleaned up through async disposal. Changing titles, rarity, archive state, selection, or plate numbers does not require icon regeneration. Changing the actual material or candidate symbol does. The application still converts JXL assets for production through its Vite image pipeline.

## Render a knot inspection set

From `packages/knot-materials`:

```sh
bun scripts/renderKnot.ts iris_steel
```

The command writes `out/render/<id>` with four 2048 × 2048 angle stills, a 2048 × 2048 2×2 angle sheet, a 120-frame 640 × 640 animated JXL angle orbit, four 2048 × 2048 camera-distance stills, a 2048 × 2048 2×2 distance sheet, a 120-frame 640 × 640 animated JXL distance sweep, and one 960-frame 640 × 640 `animation.webm`. The two simple animated JXLs use JPEG XL distance 4. The four angle views are 0°, 90°, 180° and 270°. The simple distance animation moves smoothly from near to very far and back without duplicating its loop endpoint.

The combined 16-second video is phase-shifted so frame 0 is the least noticeable loop seam: the knot is distant, exactly side-on, and material/shader time starts at zero. The first 0.5 seconds finish the distant hold, 0.5–2.5 seconds return to normal, 2.5–4.5 hold normal, 4.5–6.5 zoom extremely close, 6.5–8.5 hold close, 8.5–10.5 return to normal, 10.5–12.5 hold normal, 12.5–14.5 move out, and 14.5–16 finish the distant hold. The 50° base FOV widens modestly at both close and distant extremes so more of the knot remains visible. Preview rendering uses 1.5× supersampling plus 4× MSAA, then high-quality downsampling to the final 640 px animation or 2048 px still. It completes one full Y-axis turn every two seconds, with eased rotation so broad views linger while side-on views pass faster.

The command owns its Vite server, browser, offscreen renderer, temporary PNG frames and image/video encoding. Candidates only need the single command above.

## Generate an animated icon

```sh
bun packages/knot-materials/scripts/makeAnimatedIcon.ts opal_fire
bun packages/knot-materials/scripts/makeAnimatedIcon.ts ferrothorn --output temp/ferrothorn.animated.webm
```

The default output is `src/entries/<id>/icon.animated.webm`; the still `icon.jxl` is not replaced. It renders exactly 120 640 × 640 source frames over two seconds, making one full Y-axis rotation. It samples 0° through 357° in 3° increments, without duplicating 360° at the loop seam. A private renderer clock advances material animation at the corresponding 60 Hz sample times. The camera and image bounds remain fixed for the entire animation, with displacement-aware framing; individual frames are never cropped independently.

Capture uses explicit offscreen GPU readback, including HDR-finiteness checks. The script uses the same self-contained private renderer by default and accepts the same optional `--browser-url` and `--page-url` overrides as the still-image scripts.

Encoding requires `ffmpeg` with `libsvtav1`. The numbered PNG frames are encoded directly to 8-bit full-range 4:2:0 AV1 in a WebM container using SVT-AV1 preset 5 at CRF 20, variance boost enabled, film grain disabled, tune 0 (VQ), and explicit 8-bit input depth; there is no APNG intermediate. AV1 does not preserve the source alpha channel in this pipeline, so the experimental WebM output is opaque. Looping is a playback concern (for example, HTML `<video loop>`) rather than embedded animation metadata. All temporary frames stay outside the repository and are removed on completion or failure. The destination is replaced atomically only after capture and encoding finish.

## Narration assets

Paths are relative to this package's `src` directory:

```text
candidates/<candidate>/candidate/announce.opus
candidates/<candidate>/slug/<model-slug>/announce.opus
entries/<id>/announce.opus
```

Candidate introductions may replay on interaction. Model introductions and individual titles are remembered once per session unless explicitly replayed. Missing recordings remain silent; runtime playback never initiates paid generation. The application's `announceKnots.ts` and `prerenderAllVoices.ts` scripts write to the new package paths.

## Validation

```sh
bun --cwd packages/knot-materials test
bun run typecheck
bun test --max-concurrency 1 test/unit/knot-candidates.test.ts test/unit/knot-exhibition.test.ts test/unit/knot-cellular-fields.test.ts test/unit/progressive-knot-materials.test.ts
```

Package tests cover metadata and folder parity, unique IDs and flavor text, exhaustive rarities, helper ownership, independent material construction, metadata-only bundling, all placeholder presets, complete prompt source inclusion, deterministic sampling, CLI output from another working directory, and icon argument validation without a browser connection.