import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'

import {rooms} from './walls.ts'

const dine = rooms.find(room => room.id === 'dine')!

/** Underside of the 18 cm ceiling slab every upper-floor room gets at 5.78 m. */
export const dineCeilingUnderside = 5.78 - 0.18 / 2

/**
 * Knottingham LED panes in a 2 × 3 grid, symmetric about the room center. The offsets leave about 1.9 m to the
 * side walls, 1.6 m to the end walls and 2.6–2.9 m between neighboring housings.
 */
const dineLedGrid = {
  x: [-2.75, 2.75],
  z: [-5, 0, 5],
}

/** Each pane lights the room through one point light hung just below its diffuser. */
export const dineLedLight = {
  /** distance below the pane’s origin, close enough that the brightest ceiling spot stays hidden behind the housing */
  drop: 0.32,
  color: '#eee3ff',
  // Six of these match the mean floor and wall irradiance of the two 32 cd lights behind the old light boxes.
  intensity: 13,
  distance: 14,
  decay: 2,
}

// Like Knottingham, the housing’s top sits 5 mm into the slab so no light leaks between them.
const slotY = dineCeilingUnderside + 0.005 - knotLightHousingY - knotLightHousingSize[1] / 2

export const dineLedSlots: ReadonlyArray<KnotLightSlot> = dineLedGrid.z.flatMap((z, row) => dineLedGrid.x.map((x, slot) => ({
  id: `${row}:${slot}`,
  position: [dine.center[0] + x, slotY, dine.center[1] + z],
  row,
  slot,
})))
