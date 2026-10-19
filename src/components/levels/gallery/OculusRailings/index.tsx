import {CapsuleCollider, CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import OculusRailing from '#src/lib/gallery/railings/OculusRailing.ts'
import PolylineTubeGeometry from '#src/lib/gallery/railings/PolylineTubeGeometry.ts'
import BrushedMetalMaterial from '#src/lib/materials/metal/BrushedMetalMaterial.ts'
import {brushedAlong, geometryGrain, setGrain} from '#src/lib/materials/metal/grain.ts'
import {surroundings} from '#src/lib/materials/metal/rooms.ts'

/** Satin stainless steel, brushed along the rail and the posts, with the tower room mirrored in it. */
const railMetal = {
  surroundings: {
    ...surroundings.oculus,
    contact: 0.3,
  },
  roughness: 0.26,
  anisotropy: 0.5,
}
const radialSegments = 32

export default function OculusRailings() {
  const path = useMemo(() => new OculusRailing, [])
  const handrail = useDisposable(useMemo(() => {
    const tube = new PolylineTubeGeometry(path.points, path.radius, radialSegments)
    // Brushed along the rail: every ring follows the miter direction of its polyline vertex, so the grain bends smoothly with the rail.
    return setGrain(tube, vertex => {
      const ring = Math.floor(vertex / (radialSegments + 1))
      const previous = path.points[Math.max(0, ring - 1)]
      const next = path.points[Math.min(path.points.length - 1, ring + 1)]
      return {
        kind: 'brushed',
        axis: [next.x - previous.x, next.y - previous.y, next.z - previous.z],
      }
    })
  }, [path]))
  const handrailMaterial = useDisposable(useMemo(() => new BrushedMetalMaterial({
    ...railMetal,
    name: 'Oculus handrail brushed steel',
    grain: geometryGrain,
  }), []))
  const postMaterial = useDisposable(useMemo(() => new BrushedMetalMaterial({
    ...railMetal,
    name: 'Oculus railing post brushed steel',
    grain: () => brushedAlong([0, 1, 0]),
  }), []))
  return <RigidBody colliders={false} type='fixed'>
    <mesh castShadow geometry={handrail} material={handrailMaterial} name='oculus-continuous-handrail' />
    {path.segments.map((segment, i) => <CapsuleCollider key={i} args={[segment.halfLength, path.radius]} position={segment.position} quaternion={segment.rotation} />)}
    {path.posts.map((post, i) => <group key={i} position={post.position}>
      <CuboidCollider args={[path.postRadius, post.height / 2, path.postRadius]} />
      <mesh castShadow material={postMaterial} name='oculus-railing-post'><cylinderGeometry args={[path.postRadius, path.postRadius, post.height, 24]} /></mesh>
    </group>)}
    {[0, 1].map(t => <mesh key={t} castShadow material={postMaterial} position={path.getPoint(t)}><sphereGeometry args={[path.radius, 32, 16]} /></mesh>)}
  </RigidBody>
}
