# canvas-textures

A readback-first pipeline for browser Canvas2D graphics. The core has no Three.js or React imports; optional adapters turn final pixels into Three/WebGPU textures and manage their React lifecycle.

## Final texture in one pass

```ts
import renderCanvasTexture from 'canvas-textures/three'

const texture = renderCanvasTexture({
  width: 1024,
  height: 256,
  mipmaps: false,
  name: 'Entrance sign',
  draw(context) {
    context.fillStyle = '#122029'
    context.fillRect(0, 0, 1024, 256)
    context.fillStyle = '#fff3d9'
    context.font = '600 96px sans-serif'
    context.fillText('Welcome', 40, 160)
  },
})
// Attach to a material. The caller owns the texture.
// texture.dispose() when that material no longer needs it.
```

Every raster owns a newly created canvas. Its **first** context request includes `willReadFrequently: true` and sRGB. Drawing is synchronous; one final `getImageData()` supplies an exact `Uint8Array` view including its byte offset and length. No zero-filled placeholder image and no second pixel-buffer copy are created. Temporary canvas storage is released in a `finally` block; the texture retains its independent pixel buffer.

This is zero **additional** pixel copying, not a zero-copy GPU upload: Canvas2D readback and the eventual GPU upload still happen. Readback hints can trade GPU-accelerated drawing for faster reads; profile the whole raster operation.

## Fonts and asynchronous inputs

```ts
import {loadCanvasFonts} from 'canvas-textures'
import {prepareCanvasTexture} from 'canvas-textures/three'

const controller = new AbortController()
const texture = await prepareCanvasTexture({
  width: 1024,
  height: 256,
  mipmaps: false,
  prepare: () => loadCanvasFonts([{font: '600 96px main', text: 'Welcome'}]),
  draw(context) {
    context.font = '600 96px main'
    context.fillText('Welcome', 40, 160)
  },
}, controller.signal)

// null means cancelled. A returned texture belongs to the caller.
// A consumer cancelled after this promise resolved must also dispose its result.
```

`prepare(signal)` can return any typed input: decoded images, fonts, data, or a tuple of these. `draw(context, inputs)` receives that result. An optional `disposeInputs(inputs)` releases temporary decoded resources after the one final draw, including cancellation after preparation and draw/readback failures. No canvas is allocated until preparation finishes; aborted preparations, including late rejections, return null. Other errors propagate. Synchronous drawing/readback cannot be preempted by an abort signal. Draw callbacks must not resize the surface or return asynchronous work.

`loadCanvasBitmaps(urls, signal)` decodes URL images without creating individual GPU textures; pair it with `disposeInputs: images => closeCanvasBitmaps(images.values())` when composing an atlas. `loadCanvasFonts()` waits only for the requested faces, not unrelated `document.fonts.ready` work. Each rejected font is reported through its optional second argument (default: a warning), then drawing can use Canvas2D's fallback font. It never schedules a later redraw. Choose missing-image behavior in your own loader. Release decoded ImageBitmaps in their owner's `finally` block.

## React ownership

```tsx
import {useMemo} from 'react'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'

function Caption({text}: {text: string}) {
  const texture = useCanvasTexture(useMemo(() => ({
    width: 1024,
    height: 256,
    mipmaps: false,
    prepare: () => loadCanvasFonts([{font: '600 96px main', text}]),
    draw(context: CanvasRenderingContext2D) {
      context.font = '600 96px main'
      context.fillText(text, 40, 160)
    },
  }), [text]))
  return <mesh visible={Boolean(texture)}>
    <planeGeometry args={[4, 1]}/>
    <meshBasicNodeMaterial map={texture} transparent toneMapped={false}/>
  </mesh>
}
```

**Memoize the recipe.** Its identity is the effect key. The hook returns null until the final texture is ready; use a plain material/background or hide the decoration while loading. It aborts obsolete recipes, disposes late results, suppresses stale state updates, and owns disposal on replacement/unmount. StrictMode's initial effect replay cancels its first preparation before rasterization. Do not separately dispose the hook's texture. An optional `onError` handles non-cancellation failures; otherwise they are logged.

## Lower-level canvas and pixel ownership

```ts
import ReadbackCanvas from 'canvas-textures'
import {textureFromPixels} from 'canvas-textures/three'

const surface = new ReadbackCanvas(512, 512)
try {
  surface.context.fillRect(0, 0, 512, 512)
  const pixels = surface.read()
  const bump = textureFromPixels(pixels, {color: false})
  // Use bump and dispose it when no longer needed.
} finally {
  surface.dispose()
}
```

`ReadbackCanvas` exposes its canvas and context for multi-step algorithms. `read()` takes an owned snapshot without a redundant copy. `dispose()` releases canvas backing storage and is idempotent. `rasterizeCanvas({width, height, draw})` combines those operations without any renderer dependency. `textureFromPixels()` accepts tightly packed RGBA8 data by reference; do not detach or repurpose it while the texture uses it.

## Texture policy

| Option | Default | Meaning |
| --- | --- | --- |
| `mipmaps` | `true` | Generate mipmaps and use trilinear minification. Set false explicitly for signage where the aliasing tradeoff is accepted. |
| `anisotropy` | `16` | Used with mipmaps; forced to 1 without them to match the linear-only sampler policy. |
| `color` | `true` | sRGB color pixels; false leaves bump/height data in NoColorSpace. |
| `name` | empty | Three texture label for diagnostics. |

Orientation remains top-to-bottom canvas pixels with `flipY = true` for Three UVs; alpha remains unpremultiplied and preserved. Removing mipmaps reduces storage/generation work, but can cause distance/angle shimmering. The package does not lower resolution, cache final textures, schedule GPU uploads, move work to workers, or invent asset fallback policy. It currently uses HTMLCanvasElement and requires a browser document at raster time, not import time.

Run `bun test ./packages/canvas-textures/test` from the workspace root.
