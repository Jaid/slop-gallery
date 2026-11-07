import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import stickySurfaceGeometry from '#src/lib/placement/stickySurfaceGeometry.ts'
import world from '#src/worlds/current.ts'

const color = '#38e08c'

/**
 * `?show_sticky`: a green tint over every wall face that artworks can hang on, without its openings and reservations, hidden like the wall behind whatever stands in front of it, like its trim.
 */
export default function StickySurfaces() {
  const geometry = useDisposable(useMemo(() => stickySurfaceGeometry(world.placement.walls), []))
  return <mesh frustumCulled={false} geometry={geometry} name='sticky-surfaces' raycast={() => {}} renderOrder={1}>
    <meshBasicNodeMaterial color={color} depthWrite={false} opacity={0.3} toneMapped={false} transparent />
  </mesh>
}
