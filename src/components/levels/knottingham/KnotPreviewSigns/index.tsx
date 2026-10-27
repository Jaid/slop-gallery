import type {KnotBay} from 'knot-materials/exhibition.ts'

import {RigidBody} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useDisposable from 'disposable-lifetime/react'
import {knotBays, knotNumberLabel} from 'knot-materials/exhibition.ts'
import {knotBillboardPhysics} from 'knot-materials/knotBillboardPhysics.ts'
import {knotPreviewMountY, knotPreviewPanelOffsetY, knotPreviewTextureLayout} from 'knot-materials/KnotPreviewLayout.ts'
import {useMemo} from 'react'
import {MeshBasicNodeMaterial} from 'three/webgpu'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'
import constructors from 'virtual:knot-exhibition-materials'

import InteractiveObject from '#component/InteractiveObject'
import Stand, {Sign} from '#component/levels/knottingham/KnotBillboardSupport'
import {narrate} from '#src/lib/gallery/actions.ts'
import {fitCanvasTextureResolution, getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import useLoadingCanvasTexture from '#src/lib/useLoadingCanvasTexture.ts'

import drawPreview, {knotPreviewBackground, knotPreviewCaptionFontFamily, knotPreviewCaptionFontSize, knotPreviewCaptionFontWeight} from './drawPreview.ts'
import RuntimeKnotIconRenderer, {releaseCanvases} from './RuntimeKnotIconRenderer.ts'

/** One billboard at the west end of every row, sharing one detached renderer for their Knot screenshots. */
export function KnotPreviewSigns({x}: {
  /** where the billboards stand, relative to their row centers */
  x: number
}) {
  const heavy = useGraphicsMode()
  const renderer = useDisposable(useMemo(() => new RuntimeKnotIconRenderer(constructors, heavy), [heavy]))
  return knotBays.map(bay => <group key={bay.candidate.id} position={bay.center}><KnotPreviewSign bay={bay} renderer={renderer} x={x} /></group>)
}

/** Runtime billboard composed into one texture per candidate; no combined texture is persisted. */
export default function KnotPreviewSign({bay, renderer, x}: {
  bay: KnotBay
  renderer: RuntimeKnotIconRenderer
  /** where the billboard stands, relative to the row center */
  x: number
}) {
  const layout = knotPreviewTextureLayout(bay.finishes.length)
  const {canvasTextureMipmaps: mipmaps, canvasTextureResolution: resolution} = useGraphicsModeValue(getGraphicsProfile)
  const texture = useLoadingCanvasTexture(`billboard-texture:${bay.candidate.id}`, useMemo(() => ({
    width: layout.width,
    height: layout.height,
    resolution: fitCanvasTextureResolution(resolution, layout.width, layout.height),
    name: `Knot preview: ${bay.candidate.title}`,
    mipmaps,
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
  }), [bay, layout.height, layout.width, mipmaps, renderer, resolution]))
  const face = useDisposable(useMemo(() => new MeshBasicNodeMaterial({
    color: texture ? '#ffffff' : knotPreviewBackground,
    map: texture,
    toneMapped: false,
  }), [texture]))
  return <InteractiveObject id={`preview-${bay.candidate.id}`} action='Listen' name={`preview-${bay.candidate.id}`} position={[x, knotPreviewMountY, 0]} rotation={[0, Math.PI / 2, 0]} title={`${bay.candidate.title} billboard`} onActivate={() => narrate(`preview-${bay.candidate.id}`)}>
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} angularDamping={knotBillboardPhysics.stand.angularDamping} ccd colliders={false} linearDamping={knotBillboardPhysics.stand.linearDamping} name='billboard-stand'>
      <Stand />
    </RigidBody>
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} angularDamping={knotBillboardPhysics.sign.angularDamping} ccd colliders={false} linearDamping={knotBillboardPhysics.sign.linearDamping} name='billboard-sign' position={[0, knotPreviewPanelOffsetY, knotBillboardPhysics.sign.standGap]}>
      <Sign face={face} />
    </RigidBody>
  </InteractiveObject>
}
