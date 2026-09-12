import type {KnotBay} from '#src/lib/knots/exhibition.ts'
import type {RapierRigidBody} from '@react-three/rapier'

import {CuboidCollider, CylinderCollider, RigidBody, useRevoluteJoint} from '@react-three/rapier'
import {useEffect, useMemo, useRef} from 'react'
import {DataTexture, LinearFilter, LinearMipmapLinearFilter, MeshBasicNodeMaterial, MeshStandardNodeMaterial, SRGBColorSpace} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import {knotPreviewX} from '#src/lib/knots/exhibition.ts'
import KnotModelSignGeometry from '#src/lib/knots/KnotModelSignGeometry.ts'
import loadModelIcons from '#src/lib/knots/loadModelIcons.ts'
import {knotModelSign, modelSignSuspensionCenter, modelSignSuspensionHeight} from '#src/lib/physics/knotModelSign.ts'

import drawFace, {modelSignTextureSize} from './drawFace.ts'

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
  const face = useMemo(() => {
    const canvas = document.createElement('canvas')
    const [width, height] = modelSignTextureSize
    canvas.width = width
    canvas.height = height
    const texture = new DataTexture(new Uint8Array(width * height * 4), width, height)
    texture.flipY = true
    texture.colorSpace = SRGBColorSpace
    texture.generateMipmaps = true
    texture.minFilter = LinearMipmapLinearFilter
    texture.magFilter = LinearFilter
    texture.anisotropy = 16
    const material = new MeshBasicNodeMaterial({
      map: texture,
      toneMapped: false,
    })
    return {
      canvas,
      texture,
      material,
    }
  }, [])
  useEffect(() => {
    let active = true
    const context = face.canvas.getContext('2d')!
    const draw = (icon?: HTMLImageElement) => {
      drawFace(context, bay.title, icon)
      face.texture.image.data!.set(context.getImageData(0, 0, face.canvas.width, face.canvas.height).data)
      face.texture.needsUpdate = true
    }
    draw()
    const update = async () => {
      const [icons] = await Promise.all([loadModelIcons([bay.icon]), document.fonts.load('600 190px main')])
      if (active) {
        draw(icons.get(bay.icon))
      }
    }
    void update().catch(error => console.warn('Model sign could not be updated.', error))
    return () => {
      active = false
    }
  }, [bay.icon, bay.title, face])
  useEffect(() => () => metal.dispose(), [metal])
  useEffect(() => () => {
    geometry.dispose()
    face.material.dispose()
    face.texture.dispose()
  }, [geometry, face])
  const [width, height, depth] = knotModelSign.size
  return <group name={`model-sign-${bay.model}`} position={[knotPreviewX, knotGalleryBounds.height - knotModelSign.ceilingInset - knotModelSign.anchor[1], 0]} rotation={[0, Math.PI / 2, 0]}>
    <RigidBody ref={anchor} type="fixed" colliders={false} position={knotModelSign.anchor}/>
    <mesh geometry={geometry.canopy} material={metal} castShadow receiveShadow/>
    <RigidBody ref={sign} colliders={false} ccd canSleep={false} angularDamping={knotModelSign.angularDamping} linearDamping={knotModelSign.linearDamping} additionalSolverIterations={8}>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} mass={knotModelSign.mass} restitution={0.15}/>
      {knotModelSign.suspensionX.map(x => <CylinderCollider key={x} args={[modelSignSuspensionHeight / 2, 0.014]} position={[x, modelSignSuspensionCenter, 0]} mass={knotModelSign.suspensionMass}/>)}
      <InteractiveObject id={`model-sign-${bay.model}`} onActivate={() => narrate(`model-sign-${bay.model}`)}>
        <mesh geometry={geometry.panel} material={[metal, metal, metal, metal, face.material, face.material]} castShadow receiveShadow/>
        <mesh geometry={geometry.chains} material={metal} castShadow receiveShadow/>
      </InteractiveObject>
    </RigidBody>
  </group>
}
