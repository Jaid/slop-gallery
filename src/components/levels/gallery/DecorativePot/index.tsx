import type {PotKind} from '#src/lib/gallery/plantDecorations/catalog.ts'

import {ConvexHullCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

export type PotProps = {
  kind: PotKind
  solid?: boolean
}

export default function DecorativePot({kind, solid}: PotProps) {
  const {noiseTextures} = useGraphicsQualityValue(getGraphicsProfile)
  const resources = decorationResources()
  const materials = resources.potMaterials(noiseTextures)
  const geometry = resources.pot(kind)
  const contents = <group dispose={null} name={`pot-${kind}`}>
    <mesh castShadow geometry={geometry.shell} material={materials.shells[kind]} name='ceramic-shell' receiveShadow />
    <mesh geometry={geometry.soil} material={materials.soil} name='baked-in-soil' receiveShadow />
    <Branch if={geometry.trim}><mesh castShadow geometry={geometry.trim!} material={resources.brass} name='brass-foot-and-rim' receiveShadow /></Branch>
  </group>
  if (!solid) {
    return contents
  }
  return <RigidBody colliders={false} name={`decoration-pot-${kind}`} type='fixed'>
    <ConvexHullCollider args={[geometry.vertices]} friction={0.85} />
    <Branch if={kind === 'noir'}><CylinderCollider args={[0.065, 0.24]} position={[0, 0.065, 0]} /></Branch>
    {contents}
  </RigidBody>
}
