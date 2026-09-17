import type {RapierRigidBody} from '@react-three/rapier'
import type {KnotBay} from 'knot-materials/exhibition.ts'

import {CuboidCollider, CylinderCollider, RigidBody, useRevoluteJoint} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {knotPreviewX} from 'knot-materials/exhibition.ts'
import {candidateSignSuspensionCenter, candidateSignSuspensionHeight, knotCandidateSign} from 'knot-materials/knotCandidateSign.ts'
import KnotCandidateSignGeometry from 'knot-materials/KnotCandidateSignGeometry.ts'
import loadCandidateIcons from 'knot-materials/loadCandidateIcons.ts'
import {useEffect, useRef} from 'react'
import {MeshBasicNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'

import drawFace, {candidateSignBackground, candidateSignFontSize, candidateSignTextureSize} from './drawFace.ts'

export default function KnotCandidateSign({bay}: {bay: KnotBay}) {
  const anchor = useRef<RapierRigidBody>(null!)
  const sign = useRef<RapierRigidBody>(null!)
  useRevoluteJoint(anchor, sign, [[0, 0, 0], knotCandidateSign.anchor, knotCandidateSign.axis, knotCandidateSign.limits])
  const isQuality = useGraphicsQuality()
  const metal = isQuality ? new MeshStandardNodeMaterial({
    color: '#ac9270',
    metalness: 0.85,
    roughness: 0.3,
  }) : new MeshBasicNodeMaterial({color: '#ac9270'})
  const geometry = new KnotCandidateSignGeometry
  const {candidate} = bay
  const texture = useCanvasTexture({
    width: candidateSignTextureSize[0],
    height: candidateSignTextureSize[1],
    name: `Candidate sign: ${candidate.title}`,
    mipmaps: false,
    prepare: async () => {
      const [icons] = await Promise.all([
        loadCandidateIcons([candidate.icon]),
        loadCanvasFonts([
          {
            font: `600 ${candidateSignFontSize}px main`,
            text: candidate.title,
          },
        ]),
      ])
      return icons.get(candidate.icon)
    },
    draw: (context: CanvasRenderingContext2D, icon: HTMLImageElement | undefined) => drawFace(context, candidate.title, icon),
  })
  const face = new MeshBasicNodeMaterial({
    map: texture,
    color: texture ? '#ffffff' : candidateSignBackground,
    toneMapped: false,
  })
  useEffect(() => () => face.dispose(), [face])
  useEffect(() => () => metal.dispose(), [metal])
  useEffect(() => () => {
    geometry.dispose()
  }, [geometry])
  const [width, height, depth] = knotCandidateSign.size
  return <group name={`candidate-sign-${candidate.id}`} position={[knotPreviewX, knotGalleryBounds.height - knotCandidateSign.ceilingInset - knotCandidateSign.anchor[1], 0]} rotation={[0, Math.PI / 2, 0]}>
    <RigidBody colliders={false} position={knotCandidateSign.anchor} ref={anchor} type='fixed' />
    <mesh castShadow geometry={geometry.canopy} material={metal} receiveShadow />
    <RigidBody additionalSolverIterations={8} angularDamping={knotCandidateSign.angularDamping} canSleep={false} ccd colliders={false} linearDamping={knotCandidateSign.linearDamping} ref={sign}>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} mass={knotCandidateSign.mass} restitution={0.15} />
      {knotCandidateSign.suspensionX.map(x => <CylinderCollider args={[candidateSignSuspensionHeight / 2, 0.014]} key={x} mass={knotCandidateSign.suspensionMass} position={[x, candidateSignSuspensionCenter, 0]} />)}
      <InteractiveObject id={`candidate-sign-${candidate.id}`} onActivate={() => narrate(`candidate-sign-${candidate.id}`)}>
        <mesh castShadow geometry={geometry.panel} material={[metal, metal, metal, metal, face, face]} receiveShadow />
        <mesh castShadow geometry={geometry.chains} material={metal} receiveShadow />
      </InteractiveObject>
    </RigidBody>
  </group>
}
