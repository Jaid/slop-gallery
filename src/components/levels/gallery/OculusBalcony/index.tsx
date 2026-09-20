import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import OculusBalconyGeometry from '#src/lib/gallery/OculusBalconyGeometry.ts'

export default function OculusBalcony({material}: {material: Material}) {
  const geometry = useDisposable(useMemo(() => new OculusBalconyGeometry, []))
  const collision = colliderGeometry(geometry)
  return <RigidBody colliders={false} type='fixed'>
    <TrimeshCollider args={collision} />
    <mesh castShadow geometry={geometry} material={material} name='oculus-balcony' receiveShadow />
  </RigidBody>
}
