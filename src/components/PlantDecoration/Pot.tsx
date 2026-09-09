import type {PotKind} from '#src/lib/gallery/plantDecorations/catalog.ts'

import {ConvexHullCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import {decorationResources} from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

export type PotProps = {kind: PotKind
  solid?: boolean}

export default function Pot({kind, solid = false}: PotProps) {
  const {noiseTextures} = useGraphicsQualityValue(getGraphicsProfile)
  const resources = decorationResources()
  const materials = resources.potMaterials(noiseTextures)
  const geometry = resources.pot(kind)
  const contents = <group name={`pot-${kind}`} dispose={null}>
    <mesh name="ceramic-shell" geometry={geometry.shell} material={materials.shells[kind]} castShadow receiveShadow/>
    <mesh name="baked-in-soil" geometry={geometry.soil} material={materials.soil} receiveShadow/>
    {geometry.trim && <mesh name="brass-foot-and-rim" geometry={geometry.trim} material={resources.brass} castShadow receiveShadow/>}
  </group>
  if (!solid) {
    return contents
  }
  return <RigidBody type="fixed" colliders={false} name={`decoration-pot-${kind}`}>
    <ConvexHullCollider args={[geometry.vertices]} friction={0.85}/>
    {kind === 'noir' && <CylinderCollider args={[0.065, 0.24]} position={[0, 0.065, 0]}/>}
    {contents}
  </RigidBody>
}
