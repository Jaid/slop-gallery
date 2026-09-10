import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {CabinWindowGeometry} from '#src/lib/gallery/CabinWindowGeometry.ts'

import MeshSurfaceCollider from './MeshSurfaceCollider.tsx'

export default function CabinWindow({material}: {material: Material}) {
  const geometry = useMemo(() => new CabinWindowGeometry, [])
  const collision = useMemo(() => [geometry.lining, geometry.glass, geometry.frame].map(colliderGeometry), [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group name="cabin-tunnel-window">
    <RigidBody type="fixed" colliders={false}>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args}/>)}
      <mesh name="cabin-window-reveal" geometry={geometry.lining} material={material} receiveShadow castShadow/>
      <mesh name="cabin-window-tunnel-glass" geometry={geometry.glass}>
        <meshStandardNodeMaterial color="#b7d8d9" transparent opacity={0.18} roughness={0.12} metalness={0.1} depthWrite={false}/>
      </mesh>
      <mesh name="cabin-window-glazing-stop" geometry={geometry.frame} receiveShadow castShadow>
        <meshStandardNodeMaterial color="#ac8c58" roughness={0.4} metalness={0.65}/>
      </mesh>
    </RigidBody>
  </group>
}
