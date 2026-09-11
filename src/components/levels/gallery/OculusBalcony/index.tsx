import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import OculusBalconyGeometry from '#src/lib/gallery/OculusBalconyGeometry.ts'

export default function OculusBalcony({material}: {material: Material}) {
  const geometry = useMemo(() => new OculusBalconyGeometry, [])
  const collision = useMemo(() => colliderGeometry(geometry), [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <RigidBody type="fixed" colliders={false}>
    <TrimeshCollider args={collision}/>
    <mesh name="oculus-balcony" geometry={geometry} material={material} castShadow receiveShadow/>
  </RigidBody>
}
