import type RuntimeKnotIconRenderer from './RuntimeKnotIconRenderer.ts'
import type {KnotBay} from 'knot-materials/exhibition.ts'

import {RigidBody} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import useDisposable from 'disposable-lifetime/react'
import {knotNumberLabel, knotPreviewX} from 'knot-materials/exhibition.ts'
import {knotBillboardPhysics} from 'knot-materials/knotBillboardPhysics.ts'
import {knotPreviewMountY, knotPreviewPanelOffsetY, knotPreviewTextureLayout} from 'knot-materials/KnotPreviewLayout.ts'
import {useMemo} from 'react'
import {MeshBasicNodeMaterial} from 'three/webgpu'

import InteractiveObject from '#component/InteractiveObject'
import Stand, {Sign} from '#component/levels/knottingham/KnotBillboardSupport'
import {narrate} from '#src/lib/gallery/actions.ts'

import drawPreview, {knotPreviewBackground, knotPreviewCaptionFontFamily, knotPreviewCaptionFontSize, knotPreviewCaptionFontWeight} from './drawPreview.ts'
import {releaseCanvases} from './RuntimeKnotIconRenderer.ts'

/** Runtime billboard composed into one texture per candidate; no combined texture is persisted. */
export default function KnotPreviewSign({bay, renderer}: {
  bay: KnotBay
  renderer: RuntimeKnotIconRenderer
}) {
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
  const face = useDisposable(useMemo(() => new MeshBasicNodeMaterial({
    color: texture ? '#ffffff' : knotPreviewBackground,
    map: texture,
    toneMapped: false,
  }), [texture]))
  return <InteractiveObject id={`preview-${bay.candidate.id}`} name={`preview-${bay.candidate.id}`} position={[knotPreviewX, knotPreviewMountY, 0]} rotation={[0, Math.PI / 2, 0]} onActivate={() => narrate(`preview-${bay.candidate.id}`)}>
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} angularDamping={knotBillboardPhysics.stand.angularDamping} ccd colliders={false} linearDamping={knotBillboardPhysics.stand.linearDamping} name='billboard-stand'>
      <Stand />
    </RigidBody>
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} angularDamping={knotBillboardPhysics.sign.angularDamping} ccd colliders={false} linearDamping={knotBillboardPhysics.sign.linearDamping} name='billboard-sign' position={[0, knotPreviewPanelOffsetY, knotBillboardPhysics.sign.standGap]}>
      <Sign face={face} />
    </RigidBody>
  </InteractiveObject>
}
