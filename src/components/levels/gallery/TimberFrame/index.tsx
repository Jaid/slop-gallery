import type {TimberGeometry} from '#src/lib/gallery/passages/TimberGeometry.ts'
import type {Material} from 'three/webgpu'

import {TrimeshCollider} from '@react-three/rapier'
import {useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'

/** The enclosing fixed body and geometry ownership belong to the passage or stair flight. */
export default function TimberFrame({geometry, material, lining}: {geometry: TimberGeometry
  lining: Material
  material: Material}) {
  const collision = useMemo(() => [geometry.shell, geometry.ribs].map(colliderGeometry), [geometry])
  return <>
    {collision.map((args, i) => <TrimeshCollider key={i} args={args}/>)}
    <mesh name="timber-plank-shell" geometry={geometry.shell} material={lining} receiveShadow castShadow/>
    <mesh name="timber-faceted-portals" geometry={geometry.ribs} material={material} receiveShadow castShadow/>
  </>
}
