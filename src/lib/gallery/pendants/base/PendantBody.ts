import type {LanternRoof} from '../../../materials/lights/LanternLight.ts'
import type {BufferGeometry} from 'three/webgpu'

/** The hanging fixture itself, centered on its light source, without the rod and canopy that suspend it. */
export default abstract class PendantBody {
  /** lowest point of the fixture relative to the light source */
  abstract readonly bottom: number
  /** height above the light source where the suspension rod enters the fixture */
  abstract readonly hook: number
  /** stable identifier for mesh names */
  abstract readonly id: string
  /** half the fixture’s widest horizontal extent, for clearance checks */
  abstract readonly radius: number
  /** how the fixture’s opaque top shades the light toward the ceiling, seen from the light source */
  abstract readonly roof: LanternRoof

  /** Metal parts, owned by the caller. */
  abstract frame(): Array<BufferGeometry>

  /** Emissive parts around the light source, owned by the caller. */
  abstract glow(): Array<BufferGeometry>
}
