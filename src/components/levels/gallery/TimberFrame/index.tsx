import type TimberGeometry from '#src/lib/gallery/passages/TimberGeometry.ts'
import type {Material} from 'three/webgpu'

import {TrimeshCollider} from '@react-three/rapier'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'

/** The enclosing fixed body and geometry ownership belong to the passage or stair flight. */
export default function TimberFrame({geometry, material, lining}: {
  geometry: TimberGeometry
  lining: Material
  material: Material
}) {
  const collision = [geometry.shell, geometry.ribs].map(colliderGeometry)
  return <>
    {collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
    <mesh castShadow geometry={geometry.shell} material={lining} name='timber-plank-shell' receiveShadow />
    <mesh castShadow geometry={geometry.ribs} material={material} name='timber-faceted-portals' receiveShadow />
  </>
}
