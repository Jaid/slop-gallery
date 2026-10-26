import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {knotLightColor} from 'knot-materials/KnotLightPanels.ts'
import {PointLight} from 'three/webgpu'

// The luminance of the row area lights these replace (0.675) over a pane’s share of its row (3.5 m × 2.16 m), spread over the whole sphere: the same light per pane as before, though half of it now goes up to the ceiling.
const paneIntensity = 0.675 * 3.5 * 2.16 / 4

/** One point light just below every pane, dimmed by that pane’s brightness. */
export default class PaneEmitters {
  readonly lights: ReadonlyArray<PointLight>

  constructor(slots: ReadonlyArray<KnotLightSlot>) {
    this.lights = slots.map(slot => {
      const light = new PointLight(knotLightColor, paneIntensity, 0, 2)
      light.name = `knot-led-emission-${slot.id}`
      light.position.set(slot.position[0], slot.position[1] - 0.065, slot.position[2])
      return light
    })
  }

  update(brightness: Float32Array) {
    for (const [index, light] of this.lights.entries()) {
      light.intensity = paneIntensity * brightness[index]
    }
  }
}
