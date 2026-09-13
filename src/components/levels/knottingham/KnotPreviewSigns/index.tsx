import type {KnotBay} from '#src/lib/knots/exhibition.ts'

import {closeCanvasBitmaps, loadCanvasBitmaps, loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {useMemo} from 'react'

import InteractiveObject from '#component/InteractiveObject'
import Support from '#component/levels/knottingham/KnotBillboardSupport'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotNumberLabel, knotPreviewX} from '#src/lib/knots/exhibition.ts'
import {knotPreviewGrid, knotPreviewTextureLayout} from '#src/lib/knots/KnotPreviewLayout.ts'

import drawPreview, {knotPreviewBackground, knotPreviewCaptionFontFamily, knotPreviewCaptionFontSize, knotPreviewCaptionFontWeight} from './drawPreview.ts'

/** Runtime billboard composed into one texture per candidate; no combined texture is persisted. */
export default function KnotPreviewSign({bay}: {bay: KnotBay}) {
  const grid = knotPreviewGrid(bay.finishes.length)
  const texture = useCanvasTexture(useMemo(() => {
    const layout = knotPreviewTextureLayout(bay.finishes.length)
    return {
      width: layout.width,
      height: layout.height,
      name: `Knot preview: ${bay.title}`,
      mipmaps: false,
      prepare: async (signal: AbortSignal) => {
        const [images] = await Promise.all([
          loadCanvasBitmaps(bay.finishes.map(finish => finish.icon), signal),
          loadCanvasFonts([
            {
              font: `${knotPreviewCaptionFontWeight} ${knotPreviewCaptionFontSize}px "${knotPreviewCaptionFontFamily}"`,
              text: bay.finishes.map(finish => `${knotNumberLabel(finish.number)} · ${finish.title}`).join(' '),
            },
          ]),
        ])
        return images
      },
      disposeInputs: (images: ReadonlyMap<string, ImageBitmap>) => closeCanvasBitmaps(images.values()),
      draw: (context: CanvasRenderingContext2D, images: ReadonlyMap<string, ImageBitmap>) => drawPreview(context, bay, images),
    }
  }, [bay]))
  return <InteractiveObject id={`preview-${bay.model}`} onActivate={() => narrate(`preview-${bay.model}`)} name={`preview-${bay.model}`} position={[knotPreviewX, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
    <mesh name={`preview-surface-${bay.model}`} position={[0, 0, 0.003]}>
      <planeGeometry args={[grid.width, grid.height]}/><meshBasicNodeMaterial map={texture} color={texture ? '#ffffff' : knotPreviewBackground} toneMapped={false}/>
    </mesh>
    <Support width={grid.width} height={grid.height}/>
  </InteractiveObject>
}
