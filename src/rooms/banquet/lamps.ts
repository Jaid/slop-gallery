import type {Lamp} from '../base/Room.ts'

import {banquetLedDrop, banquetLedGrid, banquetLedY, banquetLightTemperatures} from '#src/lib/gallery/banquet.ts'

const [x] = banquetLedGrid.x
const [north, middle, south] = banquetLedGrid.z
const led = (z: number) => ({
  position: [x, banquetLedY - banquetLedDrop, z],
  strength: 36,
  // until the temperature switch picks another
  tint: banquetLightTemperatures.white.light,
  range: 8,
  // Fades more gently than physical light, so the three pools blend into one even wash.
  decay: 1.5,
  optional: true,
}) satisfies Lamp

// One under each of the three breakable LED panes down the middle, flickering and dying with its pane.
export default {
  led_north: led(north),
  led_middle: led(middle),
  led_south: led(south),
} satisfies Record<string, Lamp>
