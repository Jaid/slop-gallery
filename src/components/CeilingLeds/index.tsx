import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'
import type {Color} from 'three/webgpu'

import LedPanels from '#component/LedPanels'
import {lampLight} from '#src/lib/rendering/lamps.ts'

/** a lamp under one of the panes */
export type CeilingLed = {
  /** the lamp’s global id */
  id: string
  /** its strength while the pane is intact */
  strength: number
}

/** what the panes shine in, like a color temperature */
export type CeilingLedColor = {
  /** the color of the lamps’ light */
  light: Color
  /** the color of the lit diffusers, see `LedPanels` */
  surface: Color
}

/** Knottingham’s breakable LED panes on a room’s ceiling; the lamp under each pane flickers and dies with it. */
export default function CeilingLeds({color, lamps, name, powered = true, slots}: {
  /** the color the panes and their lamps shine in, the lamps’ own and the panes’ usual by default; they only take on a new one while switched on */
  color?: CeilingLedColor
  /** per pane, in the order of `slots` */
  lamps: ReadonlyArray<CeilingLed>
  name: string
  /** whether the panes and their lamps are switched on, true by default */
  powered?: boolean
  slots: ReadonlyArray<KnotLightSlot>
}) {
  const onBrightness = (brightness: Float32Array) => {
    for (const [index, {id, strength}] of lamps.entries()) {
      const light = lampLight(id)
      if (!light) {
        continue
      }
      light.intensity = strength * brightness[index]
      if (powered && color) {
        light.color.copy(color.light)
      }
    }
  }
  return <LedPanels color={color?.surface} name={name} powered={powered} slots={slots} onBrightness={onBrightness} />
}
