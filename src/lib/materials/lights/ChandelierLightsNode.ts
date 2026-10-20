import type {Light} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'

/**
 * A single aggregate point light approximates dozens of distributed candles for the room, but would severely overexpose nearby
 * crystal drops and metalwork. The fixture instead catches daylight, scene fill and other room lights; its flames remain emissive.
 */
export default class ChandelierLightsNode extends FilteredLightsNode {
  admits(light: Light) {
    return light.userData.aggregateChandelier !== true
  }

  lampUserData(): Record<string, unknown> {
    return {aggregateChandelier: true}
  }
}
