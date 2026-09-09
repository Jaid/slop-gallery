import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {GlasswellGroundGeometry} from '#src/lib/gallery/GlasswellGroundGeometry.ts'

export default function GlasswellGround({material}: {material: Material}) {
  const geometry = useMemo(() => new GlasswellGroundGeometry, [])
  const collision = useMemo(() => colliderGeometry(geometry), [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <RigidBody type="fixed" colliders={false}>
    <TrimeshCollider args={collision}/>
    <mesh name="glasswell-ground" geometry={geometry} material={material} castShadow receiveShadow/>
  </RigidBody>
}
