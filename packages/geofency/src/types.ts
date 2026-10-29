/** a point in Three’s coordinates, y pointing up; mutable like the Vec3 of most math libraries, so their fences accept it */
export type Position = [x: number, y: number, z: number]

/** anything that can tell whether it contains a position, like a box or a geofence */
export type Fence = {
  contains: (position: Position) => boolean
}
