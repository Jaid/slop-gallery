import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import OculusGroundGeometry from '#src/lib/gallery/OculusGroundGeometry.ts'

export default function OculusGround({material}: {material: Material}) {
  const geometry = new OculusGroundGeometry
  const collision = colliderGeometry(geometry)
  useEffect(() => () => geometry.dispose(), [geometry])
  return <RigidBody type="fixed" colliders={false}>
    <TrimeshCollider args={collision}/>
    <mesh name="oculus-ground" geometry={geometry} material={material} castShadow receiveShadow/>
  </RigidBody>
}
