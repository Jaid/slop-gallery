import type {Light} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'
import LanternEnvironment from './LanternEnvironment.ts'

const zoneKey = 'lightZone'

/** The zone a light was assigned to, if any. Zoned lamps light their own zone only. */
export const lightZone = (light: Light) => light.userData[zoneKey] as string | undefined

/**
 * Lights a dark space with nothing but the lamps hung inside it: no sun, no ambient or hemisphere fill and no daylit reflections.
 *
 * Lamps join a zone through {@link LanternLightsNode.lampUserData}. Adopted materials also reflect a near-black {@link LanternEnvironment}, so everything beyond the lamps’ reach sinks into a warm dusk.
 */
export default class LanternLightsNode extends FilteredLightsNode {
  override readonly environment = new LanternEnvironment
  // The environment is the space’s own faint bounce light, so it is used at full strength instead of each material’s share of the gallery’s sky.
  override readonly environmentIntensity = 1

  constructor(readonly zone: string) {
    super()
  }

  admits(light: Light) {
    return lightZone(light) === this.zone
  }

  /** `userData` that makes a light one of this zone’s lamps, set when the light is created so the first material build already sees it. */
  lampUserData(): Record<string, unknown> {
    return {[zoneKey]: this.zone}
  }
}
