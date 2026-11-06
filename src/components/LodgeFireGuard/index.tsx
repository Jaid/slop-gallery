import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import createFireGuardGeometry, {guardBarrier} from '#src/lib/gallery/fireplace/FireGuardGeometry.ts'

/** Bowed wrought-iron grate guarding the Lodge's raised fire, with a solid invisible barrier behind its bars. */
export default function LodgeFireGuard({material}: {material: Material}) {
  const geometry = useDisposable(useMemo(() => createFireGuardGeometry(), []))
  return <RigidBody colliders={false} type='fixed'>
    <mesh castShadow geometry={geometry} material={material} name='lodge-fireguard' receiveShadow />
    {/* Individual rods are too far apart to reliably stop a fast moving player capsule. */}
    <CuboidCollider args={guardBarrier.halfExtents} name='lodge-fireguard-barrier' position={guardBarrier.position} />
  </RigidBody>
}
