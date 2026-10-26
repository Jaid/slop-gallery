import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {knotLightColor} from 'knot-materials/KnotLightPanels.ts'
import {PointLight} from 'three/webgpu'

// Physical decay that cuts off 25 m away, so every pane lights its part of the 50 m hall without reaching the far end.
const paneIntensity = 20
const paneRange = 25

/** One point light just below every pane, dimmed by that pane’s brightness. */
export default class PaneEmitters {
  readonly lights: ReadonlyArray<PointLight>

  constructor(slots: ReadonlyArray<KnotLightSlot>) {
    this.lights = slots.map(slot => {
      const light = new PointLight(knotLightColor, paneIntensity, paneRange, 2)
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
