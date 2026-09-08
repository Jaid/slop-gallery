# Slop Gallery

Good taste. Questionable art.

![The Daydream Wing in Slop Gallery](docs/gallery.png)

A local-first, first-person WebGPU museum: five rooms, sixteen absurd artworks and tactile sculptures. Built with React, React Three Fiber, Three.js TSL and Rapier.

## Run

```sh
bun install
bun run dev
```

Open the printed localhost URL in current Chrome or Edge with hardware acceleration enabled. Production hosting requires HTTPS. This is a keyboard-and-mouse experience; the collection browser also works without WebGPU.

Use `?ai=false` for a completely local gallery session. The default connection prompt is optional – no provider requests happen without a key. All exhibition artwork, fonts, recordings and environment textures are bundled or generated locally.

## Please touch the art

| Action | Control |
| --- | --- |
| Enter / resume | Step inside, or click the canvas |
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
| Release the cursor / cancel a move | Esc |

Frames snap to valid wall surfaces, not arbitrary mesh hits. The preview includes the artwork and its title sign, accounting for neighboring works, wall edges and doorways. It stays on the aimed-at wall at any distance, but fades to 18% of its normal opacity beyond the 10 m hanging reach; move closer before releasing to hang. Invalid placements leave the original untouched. Loose frames, sculptures and plucked leaves have real physics. Aim at an individual plant leaf and hold LMB or press E to pluck it; right-click or Q throws it. Leaves tumble and can be picked up again. Once every leaf has been plucked from a plant, its pot can also be picked up and thrown with the same controls; the remaining stems travel with it. Canceling a pluck reattaches that leaf and locks the pot again. Esc cancels a pluck and returns that leaf to its stem. Throw a loose frame at a hanging one to fuse them; both source images remain recoverable until the operation succeeds, and undo restores both afterward.

Add PNG, JPEG, WebP, AVIF or GIF files with the toolbar, drag and drop or clipboard paste. A drop on a suitable wall hangs the work there; otherwise it arrives as a loose frame. Images retain their aspect ratio and are normalized to WebP. Limits: twelve files per batch, 25 mb per image, 64 million decoded pixels and 120 works per collection. Animated inputs become still images.

Collection provides search, room filters, complete stories, editable labels, image downloads and shortcuts to each work. The velvet and neon Doge portraits are separate works. The book on its pedestal can be picked up and thrown like the other sculptures.

The Serious Knot uses a polished gold material with procedural color and normal maps and a locally bundled [warehouse HDR reflection environment](public/environment/readme.md). Its reflections are material-local; the other sculptures and gallery lighting are unchanged.

The Amber Room is through the rear arch in the Cabinet of Curiosities, or directly accessible from the floor plan. Dark damask wallpaper, walnut-colored paneling, a burgundy rug and an eight-arm brass chandelier give it a warmer, dimmer atmosphere. Its walls are left empty for your collection. The floor and rug adapt the procedural materials from the `ox_smart-gallery-webgpu` reference run: staggered wood joints and wavy grain tile every 2.4 m, while fine red carpet fibers tile every 1.8 m. Color and bump maps share the same physical scale, with mipmaps and anisotropic filtering for shallow viewing angles.

The Afterhours Salon, home of the Serious Knot, has cream-and-charcoal checkerboard marble adapted from the reference run’s vestibule floor. Each roughly 69 cm tile has fine veins and narrow grout, with a glossy finish and live planar reflections that strengthen at grazing angles while keeping the grout matte. A mip-filtered, 75%-resolution reflection pass captures the actual room without recursive reflections. The Knot’s gold material and reflection environment are unchanged. The Cabinet of Curiosities, home of Mona Ribbit, uses a much subtler, softly blurred reflection over its existing wood floor for a satin-varnish effect.

## Optional AI

Settings exposes OpenRouter connection and model preferences. The query parameters are `ai`, `text_model`, `text_model_effort`, `image_model`, `audio_model`, `narrator_voice`, `narrator_character`, `eager_audio` and `lite`. Defaults follow the supplied benchmark scaffold; provider availability and voice support can change.

- Imports send a reduced image to the text model for streamed titles and stories.
- Fusion sends the hanging image first and the thrown image second to the image model.
- All sixteen default artworks have bundled Opus narration. Custom stories use optional provider speech or the browser voice. Character instructions are separate from the spoken transcript.
- Without AI, fusion is explicitly a local cut-paper collage – not a simulated model response.
- Changing AI settings cancels outstanding work. Late responses cannot overwrite a manual label edit, undo, reset or a removed source image.

The key lives in this tab’s `sessionStorage`, not the URL, IndexedDB or exports. Connected provider requests may incur charges and transmit images or story text to OpenRouter and its selected provider. Browser voices depend on the operating system and may need their own network access; recorded stories work without a speech service. Captions remain available when audio fails. The audio guide’s five gradient bars react to the actual narration spectrum, not a looping animation or gallery sound effects. Recorded and provider-generated audio are analyzed; browser speech uses a static indicator because its audio cannot be sampled. The meter remains live when decorative motion is disabled; reduced motion removes smoothing rather than hiding the audio measurements.

## Keeping your collection

Artwork, labels, placements and atmosphere preferences are automatically saved in this origin’s IndexedDB. Loose frames save their final pose when they settle. Camera position, sculpture positions, thrown pots and plucked leaves are session-only. Reloading replants the foliage. Undo history is limited to twenty collection changes and is not persisted.

Settings exports a compressed `.slop` backup containing embedded imported images. Restoring validates the document and decodes its images before asking to replace the current collection. Reset and restore are undoable collection operations. Atmosphere settings are independent of collection undo.

Browser storage is not a permanent backup. Export before clearing site data, switching browser profiles or changing the hosting origin. Use one editing tab at a time; there is no collaborative multi-tab merge protocol.

## Checks

```sh
bun run check
bun run test:live
```

`check` runs strict TypeScript checks, unit tests and the production build. `test:live` builds again, starts an isolated preview and drives a fresh headless Chrome through real WebGPU rendering, pointer lock, movement, placement, throwing, collection editing, imports, collage fusion, history, persistence, backup restoration, room navigation and lightweight rendering. It also walks through the boolean-cut portals in both directions and exercises the non-WebGPU collection fallback. Geometry tests compare the arched openings against rendered mesh rays and Rapier collision rays on both faces. Override `CHROME_PATH` if Chrome is installed elsewhere.

Browser screenshots and failure diagnostics are written under ignored `private/agent/reports`. The test verifies image-region variance in the actual browser screenshot; a merely nonblack GPU buffer is not considered proof that the gallery rendered correctly. `window.__gallery.snapshot()` and `captureFrame()` expose read-only diagnostics. Mutation helpers exist only with `?test=true`.

Provider lifecycle and narration requests are tested with controlled responses. These checks do not certify paid model availability or live provider output quality.

## Reusable capture library

The [webgpu-capture-bridge workspace package](packages/webgpu-capture-bridge/readme.md) contains the React-independent capture service and optional React Three Fiber bindings. The gallery component only connects its capture function to `window.__gallery`. Library unit tests run as part of `bun run check`.

See [design and provenance](docs/design.md) for the candidate synthesis and asset origins.
