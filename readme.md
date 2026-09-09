# Slop Gallery

Good taste. Questionable art.

A local-first, first-person WebGPU museum: five rooms, sixteen absurd artworks and tactile sculptures. Built with React, React Three Fiber, Three.js TSL and Rapier.

Uses Three r186. See the [migration and Mage fixture impact report](docs/three-r186.md) for rendering changes, new capabilities, the temporary r185 type declarations and the manual visual-review checklist.

## Run

```sh
bun install
bun run dev
```

Open the printed localhost URL in current Chrome or Edge with hardware acceleration enabled. Production hosting requires HTTPS. This is a keyboard-and-mouse experience; the collection browser also works without WebGPU.

Use `?ai=false` for a completely local gallery session. The OpenRouter manager in the menu is optional – no provider requests happen without a key. All exhibition artwork, fonts, recordings and environment textures are bundled or generated locally.

The gallery starts in a minimal menu over a dimmed, blurred view. Enter to explore; Esc returns to the menu. The HUD keeps the aiming dot, a contextual artwork overlay when you look at a title plate and a compact narrator indicator with live audio visualization while a story is playing. Audio mute, full/lightweight graphics and the expandable OpenRouter manager live in the menu. Collection, controls and preferences/backups remain available through secondary links. Reset appears only after the first in-game movement, look or action; this is remembered on the device. Opening the menu or clicking Enter alone does not reveal it.

## Please touch the art

| Action | Control |
| --- | --- |
| Enter / resume | Enter gallery / Resume |
| Walk | W, A, S, D or arrow keys |
| Look around | Mouse |
| Sprint / jump / crouch | Shift / Space / C |
| Pick up / hang a frame | Hold and release the left mouse button, or toggle E |
| Throw a held frame or sculpture | Right mouse button or Q |
| Listen to an artwork | Right mouse button or R while aiming at it |
| Inspect an artwork | Hold V |
| Collection / help / floor plan | G / H / Tab |
| Mute | M |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| Open menu / cancel a move | Esc |

Frames snap to valid wall surfaces, not arbitrary mesh hits. The preview includes the artwork and its title sign, accounting for neighboring works, wall edges and doorways. It stays on the aimed-at wall at any distance, but fades to 18% of its normal opacity beyond the 10 m hanging reach; move closer before releasing to hang. Invalid placements leave the original untouched. Loose frames, sculptures and plucked leaves have real physics. Aim at an individual plant leaf and hold LMB or press E to pluck it; right-click or Q throws it. Leaves tumble and can be picked up again. Once every leaf has been plucked from a plant, its pot can also be picked up and thrown with the same controls; the remaining stems travel with it. Canceling a pluck reattaches that leaf and locks the pot again. Esc cancels a pluck and returns that leaf to its stem. Throw a loose frame at a hanging one to fuse them; both source images remain recoverable until the operation succeeds, and undo restores both afterward.

Add PNG, JPEG, WebP, AVIF or GIF files with Add artwork in Collection, drag and drop or clipboard paste. A drop on a suitable wall hangs the work there; otherwise it arrives as a loose frame. Images retain their aspect ratio and are normalized to WebP. Limits: twelve files per batch, 25 mb per image, 64 million decoded pixels 150 mb of embedded images and 120 works per collection. Animated inputs become still images.

Collection and preferences expose Undo/Redo buttons, and keyboard history remains available inside panels except when an editable field has focus. Without WebGPU, imports, label edits, downloads and backups remain available; navigation into the world is disabled.

Collection provides search, room filters, complete stories, editable labels and years, image downloads and shortcuts to each work. The velvet and neon Doge portraits are separate works. The book on its pedestal can be picked up and thrown like the other sculptures.

The Serious Knot uses a polished gold material with procedural color and normal maps and a locally bundled [warehouse HDR reflection environment](public/environment/readme.md). Its reflections are material-local; the other sculptures and gallery lighting are unchanged.

The three sculpture pedestals use carved limestone with fluted faces, chamfered corners, stepped bases and crowns and narrow aged-brass collars set into dark reveals. Subtle procedural mineral bedding and grain run continuously across the stone. Their geometry and stone material are shared, and fixed collision meshes follow the carved surfaces while preserving the original footprint and display height.

The Amber Room is through the rear arch in the Cabinet of Curiosities, or directly accessible from the floor plan. Dark damask wallpaper, walnut-colored paneling, a burgundy rug and an eight-arm brass chandelier give it a warmer, dimmer atmosphere. Its walls are left empty for your collection. The floor and rug adapt the procedural materials from the `ox_smart-gallery-webgpu` reference run: staggered wood joints and wavy grain tile every 2.4 m, while fine red carpet fibers tile every 1.8 m. Color and bump maps share the same physical scale, with mipmaps and anisotropic filtering for shallow viewing angles.

The Afterhours Salon, home of the Serious Knot, has cream-and-charcoal checkerboard marble adapted from the reference run’s vestibule floor. Each roughly 69 cm tile has fine veins and narrow grout, with a glossy finish and live planar reflections that strengthen at grazing angles while keeping the grout matte. A mip-filtered, 75%-resolution reflection pass captures the actual room without recursive reflections. The Knot’s gold material and reflection environment are unchanged. The Cabinet of Curiosities, home of Mona Ribbit, uses a much subtler, softly blurred reflection over its existing wood floor for a satin-varnish effect.

## Optional AI

The menu’s OpenRouter manager exposes connection and model preferences. The query parameters are `ai`, `text_model`, `text_model_effort`, `image_model`, `audio_model`, `narrator_voice`, `narrator_character`, `eager_audio` and `lite`. Defaults follow the supplied benchmark scaffold; provider availability and voice support can change.

- Imports send a reduced image to the text model for streamed titles and stories.
- Fusion sends the hanging image first and the thrown image second to the image model.
- All sixteen default artworks have bundled Opus narration. Custom stories use optional provider speech or the browser voice. Character instructions are separate from the spoken transcript.
- Without AI, fusion is explicitly a local cut-paper collage – not a simulated model response.
- Changing AI settings cancels outstanding work. Late responses cannot overwrite a manual label edit, undo, reset or a removed source image.

The key lives in this tab’s `sessionStorage`, not the URL, IndexedDB or exports. Connected provider requests may incur charges and transmit images or story text to OpenRouter and its selected provider. Browser voices depend on the operating system and may need their own network access; recorded stories work without a speech service. Stories remain readable in Collection when audio fails. The in-game narrator indicator and the menu’s expandable audio guide share five gradient bars that react to the actual narration spectrum, not a looping animation or gallery sound effects. Recorded and provider-generated audio are analyzed; browser speech uses a static speaker icon, never spectrum bars, because its audio cannot be sampled. The indicator follows the actual playback source, including provider or recording failures that fall back to browser speech. The menu also includes the full current story and a stop button. Artwork overlays show title, description, creator and year. Undated works stay explicitly undated; years supplied by the AI or edited in Collection are saved and included in backups. The meter remains live when decorative motion is disabled; reduced motion removes smoothing rather than hiding the audio measurements.

## Keeping your collection

Artwork, labels, placements and atmosphere preferences are automatically saved in this origin’s IndexedDB. If loading fails, the stored record is protected and autosave stays paused until you explicitly confirm its replacement in Preferences & backups. Loose frames save their final pose when they settle. Camera position, sculpture positions, thrown pots and plucked leaves are session-only. Reloading replants the foliage. Undo history is limited to twenty collection changes and is not persisted.

Preferences & backups exports a compressed `.slop` backup containing embedded imported images. Restoring validates the document and decodes its images before asking to replace the current collection. Reset restores the original artwork, replants foliage, resets sculptures and returns to the entrance. Reset and restore are undoable collection operations; resetting session-only physics positions is not undoable. Atmosphere settings are independent of collection undo.

Browser storage is not a permanent backup. Export before clearing site data, switching browser profiles or changing the hosting origin. Use one editing tab at a time; there is no collaborative multi-tab merge protocol.

## Checks

```sh
bun run check
bun run test:live
```

`check` runs strict TypeScript checks, ESLint with a per-file/rule warning regression gate, unit tests, the production build and an isolated packed-library consumer check. Floating/misused promises and unsafe TypeScript operations are errors. The remaining style backlog is recorded in eslint-baseline.json; run bun run lint --tighten after cleanup to reduce its allowances. `test:live` builds again, starts an isolated preview and drives a fresh headless Chrome through real WebGPU rendering, pointer lock, movement, placement, throwing, collection editing, imports, collage fusion, history, persistence, backup restoration, room navigation and lightweight rendering. It also walks through the boolean-cut portals in both directions and exercises the non-WebGPU collection fallback. Geometry tests compare the arched openings against rendered mesh rays and Rapier collision rays on both faces. Override `CHROME_PATH` if Chrome is installed elsewhere.

Browser screenshots and failure diagnostics are written under ignored `private/agent/reports`. The test verifies image-region variance in the actual browser screenshot; a merely nonblack GPU buffer is not considered proof that the gallery rendered correctly. `window.__gallery.snapshot()` and `captureFrame()` expose read-only diagnostics. Mutation helpers exist only with `?test=true`.

Provider lifecycle and narration requests are tested with controlled responses. These checks do not certify paid model availability or live provider output quality.

## Reusable capture library

The [webgpu-capture-bridge workspace package](packages/webgpu-capture-bridge/readme.md) contains the React-independent capture service and optional React Three Fiber bindings. The gallery component only connects its capture function to `window.__gallery`. Library unit tests run as part of `bun run check`.


The app is private. Capture-library releases use tags matching its own version: webgpu-capture-bridge-v<version>. Stable versions publish to the latest npm tag; prereleases publish to next. The release workflow checks the tag/version match and runs the same full check before publishing only that workspace.

See [quality-report decisions](docs/quality-report-decisions.md) for accepted repairs, deliberate deferrals and the Fiber/Rapier compatibility exception.
