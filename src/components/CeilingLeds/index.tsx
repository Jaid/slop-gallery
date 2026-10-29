import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import LedPanels from '#component/LedPanels'
import {lampLight} from '#src/lib/rendering/lamps.ts'

/** a lamp under one of the panes */
export type CeilingLed = {
  /** the lamp’s global id */
  id: string
  /** its strength while the pane is intact */
  strength: number
}

/** Knottingham’s breakable LED panes on a room’s ceiling; the lamp under each pane flickers and dies with it. */
export default function CeilingLeds({lamps, name, slots}: {
  /** per pane, in the order of `slots` */
  lamps: ReadonlyArray<CeilingLed>
  name: string
  slots: ReadonlyArray<KnotLightSlot>
}) {
  const onBrightness = (brightness: Float32Array) => {
    for (const [index, {id, strength}] of lamps.entries()) {
      const light = lampLight(id)
      if (light) {
        light.intensity = strength * brightness[index]
      }
    }
  }
  return <LedPanels name={name} slots={slots} onBrightness={onBrightness} />
}
