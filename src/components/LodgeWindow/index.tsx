import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import LodgeWindowGeometry from '#src/lib/gallery/LodgeWindowGeometry.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'

export default function LodgeWindow({glass, material}: {
  glass: Material
  material: Material
}) {
  const geometry = useDisposable(useMemo(() => new LodgeWindowGeometry, []))
  // The brass stop sits between the Lodge and the corridor, out of the sun’s reach.
  const brass = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial({
    color: '#ac8c58',
    metalness: 0.65,
    roughness: 0.4,
  })), []))
  const collision = [geometry.lining, geometry.glass, geometry.frame].map(colliderGeometry)
  return <group name='lodge-tunnel-window'>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      <mesh castShadow geometry={geometry.lining} material={material} name='lodge-window-reveal' receiveShadow />
      <mesh geometry={geometry.glass} material={glass} name='lodge-window-tunnel-glass' />
      <mesh castShadow geometry={geometry.frame} material={brass} name='lodge-window-glazing-stop' receiveShadow />
    </RigidBody>
  </group>
}
