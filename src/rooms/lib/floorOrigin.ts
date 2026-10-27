import type {FloorRectangle} from '../base/Room.ts'
import type {Vec3} from 'math'

/** The middle of a floor rectangle at `floorY`, as most rooms’ origin. */
export default function floorOrigin({center: [x, z]}: FloorRectangle, floorY: number): Vec3 {
  return [x, floorY, z]
}
