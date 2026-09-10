import {CapsuleCollider, CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {TubeGeometry} from 'three/webgpu'

import {OculusRailing} from '#src/lib/gallery/railings/OculusRailing.ts'

export default function OculusRailings() {
  const path = useMemo(() => new OculusRailing, [])
  const handrail = useMemo(() => new TubeGeometry(path, Math.ceil(path.length / 0.04), path.radius, 12, false), [path])
  useEffect(() => () => handrail.dispose(), [handrail])
  return <RigidBody type="fixed" colliders={false}>
    <mesh name="oculus-continuous-handrail" geometry={handrail} castShadow><meshStandardNodeMaterial color="#7c898c" metalness={0.85} roughness={0.25}/></mesh>
    {path.segments.map((segment, i) => <CapsuleCollider key={i} args={[segment.halfLength, path.radius]} position={segment.position} quaternion={segment.rotation}/>)}
    {path.posts.map((post, i) => <group key={i} position={post.position}>
      <CuboidCollider args={[path.postRadius, post.height / 2, path.postRadius]}/>
      <mesh name="oculus-railing-post" castShadow><cylinderGeometry args={[path.postRadius, path.postRadius, post.height, 12]}/><meshStandardNodeMaterial color="#7c898c" metalness={0.85} roughness={0.25}/></mesh>
    </group>)}
    {[0, 1].map(t => <mesh key={t} position={path.getPoint(t)} castShadow><sphereGeometry args={[path.radius, 12, 8]}/><meshStandardNodeMaterial color="#7c898c" metalness={0.85} roughness={0.25}/></mesh>)}
  </RigidBody>
}
