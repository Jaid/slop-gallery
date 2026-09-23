import type RuntimeKnotIconRenderer from './RuntimeKnotIconRenderer.ts'
import type {KnotBay} from 'knot-materials/exhibition.ts'

import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {knotNumberLabel, knotPreviewX} from 'knot-materials/exhibition.ts'
import {knotPreviewGrid, knotPreviewTextureLayout} from 'knot-materials/KnotPreviewLayout.ts'
import {useMemo} from 'react'

import InteractiveObject from '#component/InteractiveObject'
import Support from '#component/levels/knottingham/KnotBillboardSupport'
import {narrate} from '#src/lib/gallery/actions.ts'

import drawPreview, {knotPreviewBackground, knotPreviewCaptionFontFamily, knotPreviewCaptionFontSize, knotPreviewCaptionFontWeight} from './drawPreview.ts'
import {releaseCanvases} from './RuntimeKnotIconRenderer.ts'

/** Runtime billboard composed into one texture per candidate; no combined texture is persisted. */
export default function KnotPreviewSign({bay, renderer}: {
  bay: KnotBay
  renderer: RuntimeKnotIconRenderer
}) {
  const grid = knotPreviewGrid(bay.finishes.length)
  const layout = knotPreviewTextureLayout(bay.finishes.length)
  const texture = useCanvasTexture(useMemo(() => ({
    width: layout.width,
    height: layout.height,
    name: `Knot preview: ${bay.candidate.title}`,
    mipmaps: false,
    prepare: async (signal: AbortSignal) => {
      const [images] = await Promise.all([
        renderer.render(bay.finishes, signal),
        loadCanvasFonts([
          {
            font: `${knotPreviewCaptionFontWeight} ${knotPreviewCaptionFontSize}px "${knotPreviewCaptionFontFamily}"`,
            text: bay.finishes.map(finish => `${knotNumberLabel(finish.number)} · ${finish.title}`).join(' '),
          },
        ]),
      ])
      return images
    },
    disposeInputs: releaseCanvases,
    draw: (context: CanvasRenderingContext2D, images: ReadonlyMap<string, HTMLCanvasElement>) => drawPreview(context, bay, images),
  }), [bay, layout.height, layout.width, renderer]))
  return <InteractiveObject id={`preview-${bay.candidate.id}`} name={`preview-${bay.candidate.id}`} position={[knotPreviewX, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} onActivate={() => narrate(`preview-${bay.candidate.id}`)}>
    <mesh name={`preview-surface-${bay.candidate.id}`} position={[0, 0, 0.003]}>
      <planeGeometry args={[grid.width, grid.height]} /><meshBasicNodeMaterial key={texture?.uuid ?? 'pending'} color={texture ? '#ffffff' : knotPreviewBackground} map={texture} toneMapped={false} />
    </mesh>
    <Support height={grid.height} width={grid.width} />
  </InteractiveObject>
}
