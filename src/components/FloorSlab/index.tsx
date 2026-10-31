import type {FloorPolygon} from '#src/lib/gallery/floorPolygons.ts'
import type {ThreeElements} from '@react-three/fiber'

import {Shape, Vector2} from 'three/webgpu'

/** A level slab over a convex area of the floor plan in world meters, from `bottom` up by `depth`, like a floor or a flat roof. */
export default function FloorSlab({polygon, bottom, depth, ...props}: Omit<ThreeElements['mesh'], 'children' | 'position' | 'rotation'> & {
  bottom: number
  depth: number
  polygon: FloorPolygon
}) {
  // Drawn with its y turned to −z, it is extruded upward once the mesh lies down.
  const shape = new Shape(polygon.map(([x, z]) => new Vector2(x, -z)))
  return <mesh castShadow receiveShadow {...props} position={[0, bottom, 0]} rotation={[-Math.PI / 2, 0, 0]}><extrudeGeometry
    args={[shape, {
      depth,
      bevelEnabled: false,
    }]}
  /></mesh>
}
