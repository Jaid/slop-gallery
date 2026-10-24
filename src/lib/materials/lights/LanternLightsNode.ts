import type {Light} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'

const zoneKey = 'lightZone'

/** The zone a light was assigned to, if any. Zoned lamps light their own zone only. */
export const lightZone = (light: Light) => light.userData[zoneKey] as string | undefined

/**
 * Lights a dark space with nothing but the lamps hung inside it: no sun and no ambient or hemisphere fill. Adopted materials still
 * reflect the scene’s environment like every other.
 *
 * Lamps join a zone through {@link LanternLightsNode.lampUserData}.
 */
export default class LanternLightsNode extends FilteredLightsNode {
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

  // Slots belong to no zone.
  override sharesShadowSlots() {
    return false
  }
}
