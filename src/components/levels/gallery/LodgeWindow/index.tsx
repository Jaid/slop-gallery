import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import LodgeWindowGeometry from '#src/lib/gallery/LodgeWindowGeometry.ts'

export default function LodgeWindow({glass, material}: {
  glass: Material
  material: Material
}) {
  const geometry = new LodgeWindowGeometry
  const collision = [geometry.lining, geometry.glass, geometry.frame].map(colliderGeometry)
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group name='lodge-tunnel-window'>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      <mesh castShadow geometry={geometry.lining} material={material} name='lodge-window-reveal' receiveShadow />
      <mesh geometry={geometry.glass} material={glass} name='lodge-window-tunnel-glass' />
      <mesh castShadow geometry={geometry.frame} name='lodge-window-glazing-stop' receiveShadow>
        <meshStandardNodeMaterial color='#ac8c58' metalness={0.65} roughness={0.4} />
      </mesh>
    </RigidBody>
  </group>
}
