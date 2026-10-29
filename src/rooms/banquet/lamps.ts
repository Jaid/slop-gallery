import type {Lamp} from '../base/Room.ts'

const led = (z: number) => ({
  position: [0, 5.3, z],
  strength: 36,
  tint: '#eee3ff',
  range: 8,
  // Fades more gently than physical light, so the three pools blend into one even wash.
  decay: 1.5,
  optional: true,
}) satisfies Lamp

// Three breakable LED panes down the middle, each lighting through one point just below its diffuser.
export default {
  led_north: led(-5),
  led_middle: led(0),
  led_south: led(5),
} satisfies Record<string, Lamp>
