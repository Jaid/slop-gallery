import type {KnotBay} from '#src/lib/knots/exhibition.ts'
import type {RapierRigidBody} from '@react-three/rapier'

import {CuboidCollider, CylinderCollider, RigidBody, useRevoluteJoint} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {useEffect, useMemo, useRef} from 'react'
import {MeshBasicNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import {knotPreviewX} from '#src/lib/knots/exhibition.ts'
import KnotModelSignGeometry from '#src/lib/knots/KnotModelSignGeometry.ts'
import loadModelIcons from '#src/lib/knots/loadModelIcons.ts'
import {knotModelSign, modelSignSuspensionCenter, modelSignSuspensionHeight} from '#src/lib/physics/knotModelSign.ts'

import drawFace, {modelSignBackground, modelSignTextureSize} from './drawFace.ts'

export default function KnotModelSign({bay}: {bay: KnotBay}) {
  const anchor = useRef<RapierRigidBody>(null!)
  const sign = useRef<RapierRigidBody>(null!)
  useRevoluteJoint(anchor, sign, [[0, 0, 0], knotModelSign.anchor, knotModelSign.axis, knotModelSign.limits])
  const isQuality = useGraphicsQuality()
  const metal = useMemo(() => {
    if (isQuality) {
      return new MeshStandardNodeMaterial({
        color: '#ac9270',
        metalness: 0.85,
        roughness: 0.3,
      })
    }
    return new MeshBasicNodeMaterial({color: '#ac9270'})
  }, [isQuality])
  const geometry = useMemo(() => new KnotModelSignGeometry, [])
  const texture = useCanvasTexture(useMemo(() => ({
    width: modelSignTextureSize[0],
    height: modelSignTextureSize[1],
    name: `Model sign: ${bay.title}`,
    mipmaps: false,
    prepare: async () => {
      const [icons] = await Promise.all([
        loadModelIcons([bay.icon]),
        loadCanvasFonts([
          {
            font: '600 190px main',
            text: bay.title,
          },
        ]),
      ])
      return icons.get(bay.icon)
    },
    draw: (context: CanvasRenderingContext2D, icon: HTMLImageElement | undefined) => drawFace(context, bay.title, icon),
  }), [bay.icon, bay.title]))
  const face = useMemo(() => new MeshBasicNodeMaterial({
    map: texture,
    color: texture ? '#ffffff' : modelSignBackground,
    toneMapped: false,
  }), [texture])
  useEffect(() => () => face.dispose(), [face])
  useEffect(() => () => metal.dispose(), [metal])
  useEffect(() => () => {
    geometry.dispose()
  }, [geometry])
  const [width, height, depth] = knotModelSign.size
  return <group name={`model-sign-${bay.model}`} position={[knotPreviewX, knotGalleryBounds.height - knotModelSign.ceilingInset - knotModelSign.anchor[1], 0]} rotation={[0, Math.PI / 2, 0]}>
    <RigidBody ref={anchor} type="fixed" colliders={false} position={knotModelSign.anchor}/>
    <mesh geometry={geometry.canopy} material={metal} castShadow receiveShadow/>
    <RigidBody ref={sign} colliders={false} ccd canSleep={false} angularDamping={knotModelSign.angularDamping} linearDamping={knotModelSign.linearDamping} additionalSolverIterations={8}>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} mass={knotModelSign.mass} restitution={0.15}/>
      {knotModelSign.suspensionX.map(x => <CylinderCollider key={x} args={[modelSignSuspensionHeight / 2, 0.014]} position={[x, modelSignSuspensionCenter, 0]} mass={knotModelSign.suspensionMass}/>)}
      <InteractiveObject id={`model-sign-${bay.model}`} onActivate={() => narrate(`model-sign-${bay.model}`)}>
        <mesh geometry={geometry.panel} material={[metal, metal, metal, metal, face, face]} castShadow receiveShadow/>
        <mesh geometry={geometry.chains} material={metal} castShadow receiveShadow/>
      </InteractiveObject>
    </RigidBody>
  </group>
}
