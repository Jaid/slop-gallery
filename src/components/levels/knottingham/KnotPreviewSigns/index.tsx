import type RuntimeKnotIconRenderer from './RuntimeKnotIconRenderer.ts'
import type {RapierRigidBody} from '@react-three/rapier'
import type {KnotBay} from 'knot-materials/exhibition.ts'

import {RigidBody, useBeforePhysicsStep, useRevoluteJoint, useRopeJoint, useSpringJoint} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import useDisposable from 'disposable-lifetime/react'
import {knotNumberLabel, knotPreviewX} from 'knot-materials/exhibition.ts'
import {knotBillboardPhysics} from 'knot-materials/knotBillboardPhysics.ts'
import {knotPreviewHeight, knotPreviewMountY, knotPreviewPanelOffsetY, knotPreviewTextureLayout} from 'knot-materials/KnotPreviewLayout.ts'
import {useMemo, useRef} from 'react'
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
  const anchor = useRef<RapierRigidBody>(null!)
  const stand = useRef<RapierRigidBody>(null!)
  const sign = useRef<RapierRigidBody>(null!)
  useSpringJoint(anchor, stand, [[0, 0, 0], [0, 0, 0], 0, knotBillboardPhysics.stand.springStiffness, knotBillboardPhysics.stand.springDamping])
  useRopeJoint(anchor, stand, [[0, 0, 0], [0, 0, 0], knotBillboardPhysics.stand.maxDisplacement])
  const signJoint = useRevoluteJoint(stand, sign, [
    [0, knotPreviewPanelOffsetY + knotPreviewHeight / 2, 0],
    [0, knotPreviewHeight / 2, 0],
    [1, 0, 0],
    [-knotBillboardPhysics.sign.hingeLimit, knotBillboardPhysics.sign.hingeLimit],
  ])
  useBeforePhysicsStep(() => {
    signJoint.current?.setContactsEnabled(false)
    signJoint.current?.configureMotorPosition(0, knotBillboardPhysics.sign.motorStiffness, knotBillboardPhysics.sign.motorDamping)
  })
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
    <RigidBody colliders={false} type='fixed' ref={anchor} />
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} canSleep={false} ccd colliders={false} enabledTranslations={[true, false, true]} linearDamping={knotBillboardPhysics.stand.linearDamping} lockRotations name='billboard-stand' ref={stand}>
      <Stand />
    </RigidBody>
    <RigidBody additionalSolverIterations={knotBillboardPhysics.solverIterations} angularDamping={knotBillboardPhysics.sign.angularDamping} canSleep={false} ccd colliders={false} linearDamping={knotBillboardPhysics.sign.linearDamping} name='billboard-sign' position={[0, knotPreviewPanelOffsetY, 0]} ref={sign}>
      <Sign face={face} />
    </RigidBody>
  </InteractiveObject>
}
