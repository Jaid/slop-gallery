import {CapsuleCollider, CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import OculusRailing from '#src/lib/gallery/railings/OculusRailing.ts'
import PolylineTubeGeometry from '#src/lib/gallery/railings/PolylineTubeGeometry.ts'
import metal from '#src/lib/materials/metal.ts'

export default function OculusRailings() {
  const path = useMemo(() => new OculusRailing, [])
  const handrail = useDisposable(useMemo(() => new PolylineTubeGeometry(path.points, path.radius, 12), [path]))
  return <RigidBody colliders={false} type='fixed'>
    <mesh castShadow geometry={handrail} material={metal} name='oculus-continuous-handrail' />
    {path.segments.map((segment, i) => <CapsuleCollider key={i} args={[segment.halfLength, path.radius]} position={segment.position} quaternion={segment.rotation} />)}
    {path.posts.map((post, i) => <group key={i} position={post.position}>
      <CuboidCollider args={[path.postRadius, post.height / 2, path.postRadius]} />
      <mesh castShadow material={metal} name='oculus-railing-post'><cylinderGeometry args={[path.postRadius, path.postRadius, post.height, 12]} /></mesh>
    </group>)}
    {[0, 1].map(t => <mesh key={t} castShadow material={metal} name='oculus-handrail-end-cap' position={path.getPoint(t)}><sphereGeometry args={[path.radius, 12, 8]} /></mesh>)}
  </RigidBody>
}
