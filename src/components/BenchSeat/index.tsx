import type {Vec3} from '#src/lib/gallery.ts'
import type {Material} from 'three/webgpu'

import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

/** A single upholstered seat with broad, soft edge highlights. */
export default function BenchSeat({material, position, size}: {
  material?: Material
  position: Vec3
  size: Vec3
}) {
  const [width, height, depth] = size
  const geometry = useDisposable(useMemo(() => new RoundedBoxGeometry(width, height, depth, 4, Math.min(0.065, height / 2)), [depth, height, width]))
  return <mesh castShadow material={material} name='bench-seat' position={position} receiveShadow>
    <primitive attach='geometry' object={geometry} />
    <Branch not={material}><meshStandardNodeMaterial color='#6e4f30' roughness={0.5} /></Branch>
  </mesh>
}
