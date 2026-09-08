import {useEffect, useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

import type {Vec3} from '#src/lib/gallery.ts'

/** A single upholstered seat with broad, soft edge highlights. */
export default function BenchSeat({position, size}: {position: Vec3, size: Vec3}) {
  const [width, height, depth] = size
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 4, Math.min(0.065, height / 2)), [width, height, depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh name="bench-seat" position={position} castShadow receiveShadow>
    <primitive object={geometry} attach="geometry"/>
    <meshStandardMaterial color="#6e4f30" roughness={0.5}/>
  </mesh>
}
