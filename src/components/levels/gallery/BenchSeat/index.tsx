import type {Vec3} from '#src/lib/gallery.ts'

import {useEffect} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

/** A single upholstered seat with broad, soft edge highlights. */
export default function BenchSeat({position, size}: {
  position: Vec3
  size: Vec3
}) {
  const [width, height, depth] = size
  const geometry = new RoundedBoxGeometry(width, height, depth, 4, Math.min(0.065, height / 2))
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh castShadow name='bench-seat' position={position} receiveShadow>
    <primitive attach='geometry' object={geometry} />
    <meshStandardNodeMaterial color='#6e4f30' roughness={0.5} />
  </mesh>
}
