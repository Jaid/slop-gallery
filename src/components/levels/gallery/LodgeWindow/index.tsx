import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import LodgeWindowGeometry from '#src/lib/gallery/LodgeWindowGeometry.ts'

export default function LodgeWindow({material}: {material: Material}) {
  const geometry = useMemo(() => new LodgeWindowGeometry, [])
  const collision = useMemo(() => [geometry.lining, geometry.glass, geometry.frame].map(colliderGeometry), [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group name="lodge-tunnel-window">
    <RigidBody type="fixed" colliders={false}>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args}/>)}
      <mesh name="lodge-window-reveal" geometry={geometry.lining} material={material} receiveShadow castShadow/>
      <mesh name="lodge-window-tunnel-glass" geometry={geometry.glass}>
        <meshStandardNodeMaterial color="#b7d8d9" transparent opacity={0.18} roughness={0.12} metalness={0.1} depthWrite={false}/>
      </mesh>
      <mesh name="lodge-window-glazing-stop" geometry={geometry.frame} receiveShadow castShadow>
        <meshStandardNodeMaterial color="#ac8c58" roughness={0.4} metalness={0.65}/>
      </mesh>
    </RigidBody>
  </group>
}
