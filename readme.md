# Slop Gallery

Good taste. Questionable art.

A local-first, first-person WebGPU museum: nine rooms across multiple elevations, sixteen absurd artworks and tactile sculptures. Built with React, React Three Fiber, Three.js TSL and Rapier.

Uses Three r186. See the [migration and Mage fixture impact report](docs/three-r186.md) for rendering changes, new capabilities, the temporary r185 type declarations and the manual visual-review checklist.

## Run

```sh
bun install
bun run dev
```

Vite runs through Bun with the runner config loader and listens on all interfaces; `vite.tower.lan` is allowed for the local HTTPS proxy. `bun run build:dev` writes to `out/build/development`; `bun run build` writes the production bundle to `dist`; `bun run preview` serves that production build on loopback. Other nonproduction modes write to `out/build/<mode>`.

The shared Vite config enables React Compiler, package-derived page titles, media mixins, PostCSS normalization and Autoprefixer for Chrome 152+. Production adds Terser, advanced CSS optimization and flat named React/vendor/main chunks. Source maps remain enabled. Property reads retain their side effects, and CSS optimization preserves fonts, animation identifiers and stacking levels referenced by application code. The WebGPU Fiber alias and mode-specific Victoria telemetry environment settings apply to both modes. Production filenames are stable, so deployment must revalidate JavaScript and CSS rather than cache them as immutable.

Open the printed localhost URL in current Chrome or Edge with hardware acceleration enabled. Production hosting requires HTTPS. This is a keyboard-and-mouse experience; native WebGPU is required; there is no WebGL or collection-only compatibility mode.

Use `?ai=false&telemetry=false` for a completely local gallery session. The OpenRouter manager in the menu is optional – no provider requests happen without a key. All exhibition artwork, recordings and environment textures are bundled or generated locally. UI fonts use locally installed Geologica and JetBrains Mono with system fallbacks; no fonts are downloaded.

The gallery starts in a minimal menu over a dimmed, blurred view. The menu exposes four stages: `first` for the first page visit, `return` for later page visits, `pause` after Escape and `unfocus` after focus loss or an application-triggered unlock. First visits offer Enter gallery; returning visits offer Continue and New game, which resets and enters immediately without confirmation. Escape shows the configuration and a three-column layout with the upper minimap on the left, menu controls in the center and lower minimap on the right: monochrome wall outlines, a red viewing cone and blue dots at live portrait locations, without visible labels or room numbers. Unfocus shows only the title and Resume button. Visits are remembered in local storage independently of in-game controls. Pointer Lock does not report the unlock reason, so a focused, connected target with no application-triggered release is treated as Escape; focus loss and explicit releases take precedence. The HUD keeps the aiming dot, a contextual artwork overlay when you look at a title plate and a compact narrator indicator with live audio visualization while a story is playing. Audio mute, full/lightweight graphics and the always-expanded OpenRouter connection live in the menu. Collection, Controls and Preferences panels and the menu’s keyboard hint are removed; Tab still opens the floor plan while exploring. There is no separate Reset gallery control; use New game on a returning visit.

## UI components

Styled UI components live in their own `src/components/<Name>/` folders with `index.tsx` and `style.module.sass`, imported as `css`. The menu controls, OpenRouter connection, floor plan, narration indicators and drag overlay have separate owners. `src/style.sass` contains only local font declarations, document defaults and element resets; `src/style/_ui.sass` shares small visual mixins without emitting global classes. Shared colors live in `src/style/_colors.sass` and compile to literal values; styles do not use CSS custom properties. The interface uses a simple dark palette instead of the former display-font styling.

Renderer-free component tests compile actual Sass modules through Vite. Style tests check module exports and selector isolation; live-test selectors use stable data attributes rather than generated class names.

## Please touch the art

| Action | Control |
| --- | --- |
| Enter / resume | Enter gallery / Continue / Resume |
| Walk | W, A, S, D or arrow keys |
| Look around | Mouse |
| Sprint / jump / crouch | Shift / Space / C |
| Pick up / hang a frame | Hold and release the left mouse button, or toggle E |
| Throw a held frame or sculpture | Right mouse button or Q |
| Listen to an artwork | Right mouse button or R while aiming at it |
| Inspect an artwork | Hold V |
| Floor plan | Tab |
| Mute | M |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| Open menu / cancel a move | Esc |

Frames snap to valid wall surfaces, not arbitrary mesh hits. The preview includes the artwork and its title sign, accounting for neighboring works, wall edges and doorways. It stays on the aimed-at wall at any distance, but fades to 18% of its normal opacity beyond the 10 m hanging reach; move closer before releasing to hang. Invalid placements leave the original untouched. Loose frames, sculptures and plucked leaves have real physics. Aim at a leaf on an interactive specimen and hold LMB or press E to pluck it; right-click or Q throws it. Leaves tumble and can be picked up again. Remove all foliage to unlock its pot; specimens 04 and 06 also require uprooting the remaining stalk bundle first. Pots and uprooted plants use the same pickup and throw controls. Canceling a pluck reattaches that leaf and locks the pot again. Esc cancels a pluck and returns that leaf to its stem. Throw a loose frame at a hanging one to fuse them; both source images remain recoverable until the operation succeeds, and undo restores both afterward.

Two additional interactive specimens stand near the front of the botanical display: 33, a bird of paradise with nine pluckable leaves, and 34, a peace lily with ten leaves and three pluckable flowers. Their stalks break at varied heights, leaving stumps attached to the pot; the pot unlocks after the last leaf or flower is plucked. Reset restores both plants. Specimens 04 (snake plant) and 06 (calathea) have three stages: rip off their leaves, grab the exposed root/stalk bundle, then pick up the empty pot. Their original geometry and numbering stay unchanged. Reset restores these specimens too. The jade bonsai remains decorative.

Add PNG, JPEG, WebP, AVIF or GIF files with drag and drop or clipboard paste. A drop on a suitable wall hangs the work there; otherwise it arrives as a loose frame. Images retain their aspect ratio and are normalized to WebP. Limits: twelve files per batch, 25 mb per image, 64 million decoded pixels 150 mb of embedded images and 120 works per collection. Animated inputs become still images.

Keyboard Undo/Redo remains available, including inside the floor plan, except when an editable field has focus. Without native WebGPU, the app displays its requirements instead of starting an alternate gallery mode.

Read artwork titles and stories by aiming at their title plates. Collection browsing, label editing and image-download UI are no longer exposed. The velvet and neon Doge portraits are separate works. The book on its pedestal can be picked up and thrown like the other sculptures.

The Serious Knot uses a polished gold material with procedural color and normal maps and a locally bundled [warehouse HDR reflection environment](public/environment/readme.md). Its reflections are material-local; the other sculptures and gallery lighting are unchanged.

The three sculpture pedestals use carved limestone with fluted faces, chamfered corners, stepped bases and crowns and narrow aged-brass collars set into dark reveals. Subtle procedural mineral bedding and grain run continuously across the stone. Their geometry and stone material are shared, and fixed collision meshes follow the carved surfaces while preserving the original footprint and display height.

The former secret room is now **The Antechamber**. Its east doorway leads down 44 illuminated stone steps to **Moonfall**, 8 m below the main gallery. The lower flight is twice as wide as the upper flight; a rounded landing smoothly joins their walls, moldings and brass handrails. Each handrail is a single closed mesh through both flights and the curve, with matching collision and no exposed join caps. The 28 × 28 m hall keeps its north tunnel and east stair connection, expanding west and south. Its center contains an 18 m-wide circular floor opening with a rough lunar impact crater: irregular slopes, smaller depressions, radial ridges and scattered angular rubble descend about 360 cm below the slate floor. The original orbital light sculpture floats above it. A closed ring of 32 bronze stanchions and sagging ropes protects the perimeter. Floor queries, dropped objects and saved player positions use the crater’s actual terrain; the ropes use mesh-accurate collision rather than invisible solid panels. The wall-mounted LEDs flank the full stair opening. Sienna and Moonfall have no benches, keeping their floors and approaches open. The perimeter walls remain available for your collection. The floor plan includes both levels and the stairs; navigation, imports, wall placement and saved collections use the lower floor’s elevation. Existing secret-room wall placements migrate to the Antechamber without changing artwork or labels; frames that covered the new doorway arrive loose on the Antechamber floor.

Sienna is through the rear arch in Vesper, or directly accessible from the floor plan. Dark damask wallpaper, walnut-colored paneling, a burgundy rug and an eight-arm brass chandelier give it a warmer, dimmer atmosphere. Its walls are left empty for your collection. The floor and rug adapt the procedural materials from the `ox_smart-gallery-webgpu` reference run: staggered wood joints and wavy grain tile every 2.4 m, while fine red carpet fibers tile every 1.8 m. Color and bump maps share the same physical scale, with mipmaps and anisotropic filtering for shallow viewing angles.

Dine, home of the Serious Knot, has cream-and-charcoal checkerboard marble adapted from the reference run’s vestibule floor. Quality mode uses polished marble with filtered, nonrecursive planar reflections and a subtler satin-varnish reflection on Vesper’s wood floor. Performance keeps the veins, grout and wood grain but uses matte finishes without allocating planar reflection targets. All grounds, including Sienna’s wood and carpet, opt out of environment reflections in performance mode. The Knot’s gold material and reflection environment are unchanged.

Vesper has seven open botanical reliefs, just above the baseboards near its corners, instead of repeated lower-wall panels: carved sage leaves and floral rosettes with golden scrollwork and metallic details using the Serious Knot’s polished gold material, procedural grain and local HDR reflections. The shallow ornaments stay behind hung frames and shift inward where a doorway blocks a corner, keeping them clear of the doorway trim. The east-wall ornaments symmetrically flank the doorway, matching the corner ornaments’ clearance from the outside of its frame. The south wall beside the Sienna doorway is left undecorated. All seven share a center height of 94 cm. Shared, instanced geometry draws the entire room’s ornamentation in two calls.

## Lobby fountain, entrance and Lodge–Corridor loop

A three-tier carved limestone fountain stands at approximately `[0, 0, -6]` in Lobby, clear of the glass floor. Brass inlays, parabolic jets, rippling pools, aerated cascades and GPU-animated ballistic spray make it a working water feature rather than a static sculpture. Water uses native TSL physical materials with a water-like index of refraction; Quality adds transmission while Performance retains animation without a transmission pass. The hollow basins have mesh-accurate collision, so thrown objects can land inside them. Water is visual, not a fluid simulation. Four symmetrically arranged benches surround the fountain, with lengthwise teak battens, exposed fasteners and brushed-metal U-frames rather than an upholstered seat.

The north wall now has a grand, closed walnut-and-bronze entrance in an arched limestone surround. It is architectural only; there is no exterior behind it. The default Orange artwork moves to the northeast extension wall. Existing custom art is not overwritten: frames covering the entrance or new passage openings are preserved as reachable loose frames when the collection loads.

From the Oculus’s raised north platform, a 440 cm-wide arched opening near `[0, -5, -31]` matches the tower platform’s diameter and enters an equally wide rough ashlar tunnel with a barrel vault and warm cage lanterns. It leads west into **Lodge**, a cedar-lined room at `[-25, -5, -31]` with timber beams, a hearth, seating and hanging walls. Its return passage exits the west wall near `[-30, -5, -33.6]` and runs around the outside of the Lodge. The Corridor from Lodge to Sienna is 400 cm wide and timber-clad, with closely spaced faceted portal frames, mitered angled rafters, a flat crown and wooden handrails beside the stairs. It meets 28 wooden steps with wide, half-round red carpet pads whose curved edges face downstairs. From Sienna, Corridor begins immediately with stairs descending through the west doorway at `[-20, 0, 10.4]`. The opening is inset from the north corner to leave proper jamb and player clearance.

Both the fountain and Oculus’s north entrance are centered on the tower’s axis. Beneath the tower ramp, a 305 cm-wide asymmetric underpass reaches the circular tower’s rear edge and has a tall tower-side jamb and a sloping roof that rounds tangentially into both jambs. Its visible opening and collision come from the same solid, leaving the walkable ramp above unchanged. Environmental room names, directional signs and decorative taglines are removed; artwork captions and the floor-plan UI remain.

Above the Lodge’s west-wall bench, a rectangular, wood-lined recess opens all the way through to the timber tunnel. A single glass pane with a narrow brass stop closes the tunnel-side end, leaving the room-side recess open and explorable while crouching. The tunnel-side reveals follow the existing sloped plank profile without projecting into the passage. The structural wall, timber lining and rafters share the same cutout, and the glass and reveals have matching physical collision.

The floor plan, navigation, import placement, loose-object recovery, saved collections and surface-appropriate footsteps treat Lodge and Corridor as separate rooms while preserving both routes. Shared passage footprints generate nonoverlapping floors and open-ended sidewalls; the stair-flight abstraction supports either horizontal axis. The timber enclosure shares its visible geometry with collision and follows the stair grade without tilting its upright posts; portal frames stop before elbows to keep turns unobstructed. Timber passage walls omit conventional baseboards and cornices so their faces cannot overlap the structural ribs. The ribs meet the lining without overlapping end caps, and room entrances have a projecting timber reveal clear of the structural wall ends. Collision meshes weld render-only UV seams and remove degenerate triangles before Rapier builds contact topology.

The Sienna chandelier now hangs from a fixed ceiling anchor on a spherical Rapier joint. The fixture hangs 50 cm lower on an extended stem, with lighter mass and reduced damping for a more visible swing. Heavy sculptures and pots impart real momentum through separate arm, hoop, stem and pendant colliders. The fixture and its light swing together while the canopy stays fixed, damping brings it to rest and Reset restores the original pose. There is no canned impact animation.

## Continuing a visit

New visitors spawn at `[0, 0.05, -9]`, facing north toward the main entrance. Saves and portable backups include the player’s feet position and yaw. Refresh resumes that pose, not the temporary inspection camera or head bob. Before the first physics step or camera frame, the full player capsule is checked against the loaded colliders: keep the saved position standing if it fits, restore crouched under low ceilings or use the default spawn if neither stance fits. Crouch-only spaces remain explorable after reload without briefly showing the void above the ceiling; the actual resolved position is checkpointed. Movement is checkpointed independently of artwork so walking never fills Undo history or repeatedly rewrites image blobs; visibility loss and page exit synchronously preserve the latest pose. Unreadable collections remain protected, and invalid or obsolete saved positions fall back to the default spawn without discarding artwork. Reset returns to the new spawn; undoing artwork changes does not teleport the player.

## Botanical assets

The temporary plant preview, its numbered signs and all plant placements have been removed. The open floor remains clear. The reusable pot and plant catalogs, modular `PlantDecoration` components and interactive `DestructiblePlant` models remain available. Pots are added only at chosen locations: Ivory flute pots stand in the southwest and northeast corners of Dine, and matching blue-green Celadon pots stand in the northwest and northeast corners of Lobby. Sienna has no pots or plants. Each pot randomly selects from all ten plant varieties once per mount; ordinary rerenders and gallery resets preserve its selection. Interactive varieties retain their plucking and pot-pickup behavior.

## Optional AI

The menu’s OpenRouter section is always expanded and exposes only the API key and AI-enable controls. Model, voice, character, reasoning-effort and eager-audio preferences come exclusively from URL parameters (with parser defaults when absent). The query parameters are `ai`, `text_model`, `text_model_effort`, `image_model`, `audio_model`, `narrator_voice`, `narrator_character` and `eager_audio`. Defaults follow the supplied benchmark scaffold; provider availability and voice support can change.

- Imports send a reduced image to the text model for streamed titles and stories.
- Fusion sends the hanging image first and the thrown image second to the image model.
- All sixteen default artworks have bundled Opus narration. Custom stories use optional provider speech or the browser voice. Character instructions are separate from the spoken transcript.
- Without AI, fusion is explicitly a local cut-paper collage – not a simulated model response.
- Changing AI settings cancels outstanding work. Late responses cannot overwrite a manual label edit, undo, reset or a removed source image.

The key lives in this tab’s `sessionStorage`, not the URL, IndexedDB or exports. Connected provider requests may incur charges and transmit images or story text to OpenRouter and its selected provider. Browser voices depend on the operating system and may need their own network access; recorded stories work without a speech service. Stories remain readable on artwork overlays when audio fails. The in-game narrator indicator and the menu’s expandable audio guide share five bars that react to the actual narration spectrum, not a looping animation or gallery sound effects. Recorded and provider-generated audio are analyzed; browser speech uses a static speaker icon, never spectrum bars, because its audio cannot be sampled. The indicator follows the actual playback source, including provider or recording failures that fall back to browser speech. The menu also includes the full current story and a stop button. Artwork overlays show title, description, creator and year. Undated works stay explicitly undated; artwork years remain part of the saved collection.

## Keeping your collection

Artwork, labels, placements and audio mute state are automatically saved in this origin’s IndexedDB. Frame finishes and the lobby palette are no longer configurable or persisted: frames use gold and the lobby uses its fixed ivory color. Old saves still load, but their retired palette and frame fields are ignored. If loading fails, the stored record is protected and autosave stays paused; there is no recovery panel. Loose frames save their final pose when they settle. Player position and yaw persist across refreshes; sculpture positions are session-only. Undo history is limited to twenty collection changes and is not persisted.

The repository retains validated compressed `.slop` import/export for tooling and tests, but there is no backup or restore UI. Reset restores the original artwork, replants foliage, resets sculptures and returns to the entrance. Reset and restore are undoable collection operations; resetting session-only physics positions is not undoable. Audio mute is independent of collection undo.

Browser storage is not a permanent backup. Preserve browser data before clearing site data, switching browser profiles or changing the hosting origin. Use one editing tab at a time; there is no collaborative multi-tab merge protocol.

## Development mode

Load the gallery with `?development=true` (or append `&development=true` to existing query parameters) to expose `window['slop.gallery']` once the 3D scene mounts. This is an explicit runtime opt-in, including in production builds; changing the flag requires a reload. It does not enable the separate `?test=true` mutation helpers.

```js
const aim = window['slop.gallery'].getAim()
aim.hit?.point // Exact world-space {x, y, z} of the nearest mesh hit, in meters.
aim.hit?.mesh // Mesh name, UUID, numeric id, type, geometry type and scalar metadata.
aim.hit?.ancestors // Parent-to-root identities and metadata, including wall or artwork ids.
aim.hits // All intersected meshes/instances, ordered nearest first.
```

The ray follows the center of the camera view, not the desktop cursor. It works while the menu is open or pointer lock is released, so you can aim, open the console and inspect without moving the camera. Each call computes a fresh, JSON-serializable snapshot; no per-frame picking work is added. `hit` is `null` and `hits` is empty when nothing is intersected. Coordinates retain the raycaster’s floating-point precision without rounding.

Hits include distance, world-space point and surface normal, geometry-local point, UV, triangle index, instance id and material identity. For instanced geometry, the local point and normal account for the individual instance transform. Each mesh/instance appears once at its nearest surface; subsequent hits can be behind the first object and do not imply visibility through it. Hidden subtrees, camera layers, invisible materials, fully transparent materials and camera clipping distances are respected. This is geometric raycasting, not pixel picking: texture alpha, shader displacement, normal maps and postprocessing do not change the reported intersection. Metadata copies only scalar `userData` values, never live Three.js objects or nested application state.

## Checks

```sh
bun run check
bun run test:live
```

`check` runs strict TypeScript checks, ESLint with a per-file/rule warning regression gate, unit tests, the production build and an isolated packed-library consumer check. Floating/misused promises and unsafe TypeScript operations are errors. The remaining style backlog is recorded in eslint-baseline.json; run bun run lint --tighten after cleanup to reduce its allowances. `test:live` builds again, starts an isolated preview and drives a fresh headless Chrome through real WebGPU rendering, pointer lock, movement, placement, throwing, paste/drop imports, collage fusion, history, persistence, reset, room navigation and lightweight rendering. It also walks through the boolean-cut portals in both directions and verifies that a non-WebGPU browser cannot start the gallery. Geometry tests compare the arched openings against rendered mesh rays and Rapier collision rays on both faces. Override `CHROME_PATH` if Chrome is installed elsewhere.

Browser screenshots and failure diagnostics are written under ignored `private/agent/reports`. The test verifies image-region variance in the actual browser screenshot; a merely nonblack GPU buffer is not considered proof that the gallery rendered correctly. `window.__gallery.snapshot()` and `captureFrame()` expose read-only diagnostics. Mutation helpers exist only with `?test=true`.

Provider lifecycle and narration requests are tested with controlled responses. These checks do not certify paid model availability or live provider output quality.

## Reusable game root

The [three-fiber-game workspace package](packages/three-fiber-game/readme.md) provides the native WebGPU Canvas, typed keyboard controls and optional Rapier physics. Its `wrapper` and `sceneWrapper` props accept one component or a readonly list, with the first wrapper outermost. Gallery-specific graphics budgets stay in `App/World`; capture, telemetry and postprocessing are injected by the stable `App/GameScene` wrapper. Package tests and the isolated packed-consumer check run as part of `bun run check`.

## First-person player

The [ego-player workspace package](packages/ego-player/readme.md) owns reusable Rapier movement, crouch clearance, jumping and the first-person camera. It accepts an explicit input reader, exposes a feet-based teleport/snapshot ref and includes a React-independent motor entry. The gallery’s Player component only connects inspection, navigation, footsteps and telemetry. Package tests exercise real physics and headless React lifecycles; the packed-consumer check verifies both public entries outside the workspace.

## Reusable capture library

The [webgpu-capture-bridge workspace package](packages/webgpu-capture-bridge/readme.md) contains the React-independent capture service and optional React Three Fiber bindings. The gallery component only connects its capture function to `window.__gallery`. Library unit tests run as part of `bun run check`.


The app is private. Capture-library releases use tags matching its own version: webgpu-capture-bridge-v<version>. Stable versions publish to the latest npm tag; prereleases publish to next. The release workflow checks the tag/version match and runs the same full check before publishing only that workspace.

See [quality-report decisions](docs/quality-report-decisions.md) for accepted repairs, deliberate deferrals and the Fiber/Rapier compatibility exception.

## Telemetry

`telemethree` provides reusable metrics, logs, traces and Three frame/scene statistics. `telemethree-ego` adds player position, velocity and aim. The app’s `src/lib/telemetry` integration adds gallery state/events and pushes all three signals to Victoria through a same-origin development relay. The existing NAS configuration is unchanged.

Telemetry is enabled in Vite development, disabled by `?telemetry=false` or `?test=true` and opt-in for production via `VITE_TELEMETRY_ENDPOINT`. With `?development=true`, `window['slop.gallery'].getTelemetry()` reports delivery status. See the [core API](packages/telemethree/readme.md), [player layer](packages/telemethree-ego/readme.md) and [gallery integration, endpoint configuration and queries](src/lib/telemetry/readme.md).

## WebGPU-exclusive rendering

All app materials use node materials. The renderer constructs `WebGPUBackend` directly with no fallback, so failed adapter/device initialization never creates a WebGL context. Vite redirects transitive bare Fiber imports (including Rapier) to `@react-three/fiber/webgpu` so dependencies share the same WebGPU Canvas context. Telemetry packages expose one `/react` entry, not backend-specific variants. Capture and statistics accept concrete Three WebGPU objects rather than cross-engine renderer adapters.

This removes owned compatibility paths; upstream Three/Drei dependencies can still contain unused WebGL-related code. The project does not patch third-party engine internals to pretend that those upstream APIs no longer exist.

## Graphics quality

The menu switches between **Quality** (default) and **Performance**. The separate URL parameter is `graphics=quality` or `graphics=performance`; missing or invalid values select quality. The old `lite` flag is no longer used.

Quality uses a device pixel ratio capped at 2, shadows and the GTAO/bloom/vignette/SMAA pipeline. Performance renders directly at device pixel ratio 1, without shadows or postprocessing. Quality retains procedural dirt and clay textures and floor reflections. Performance uses clean, matte dirt and pot finishes and disables both environment and planar reflections on grounds. Finish variants are allocated lazily and shared without replacing plant or pot geometry. Switching modes does not remount the scene, reset the player or rebuild the physics world.

The renderer-independent [use-graphics-quality](packages/use-graphics-quality/readme.md) package provides controlled boolean React state through `isQuality`, typed value selectors and `useGraphicsQuality.getName(isQuality)` for lowercase names. URL state and gallery-specific rendering budgets stay in the application, separate from AI settings.
