import type {Lamp} from '../base/Room.ts'

import moonfallWallFixtures from '#src/lib/gallery/moonfall/fixtures.ts'

const [west, east] = moonfallWallFixtures
/** 60 cm in front of the wall LED’s housing at `z` on the side’s wall */
const wallLed = ({side, lightX}: typeof west, z: number, y: number, lamp: Pick<Lamp, 'range' | 'strength'>) => ({
  ...lamp,
  position: [lightX - side * 0.6, y, z],
  tint: '#91c9c4',
}) satisfies Lamp
const [north, south] = east.lightZs

export default {
  // Four wall LEDs down the west wall, leaving its middle dark.
  ...Object.fromEntries(west.lightZs.map((z, index) => [`wall_west_${index + 1}`, wallLed(west, z, 2.8, {
    strength: 5,
    range: 6,
  })])),
  // On the east only the pair flanking the stair door, hanging lower and brighter.
  wall_east_north: wallLed(east, north, 2.2, {
    strength: 15,
    range: 10,
  }),
  wall_east_south: wallLed(east, south, 2.2, {
    strength: 15,
    range: 10,
  }),
  spotlight: {
    kind: 'spot',
    position: [-7, 3.3, -4],
    target: [0, -1.5, 0],
    angle: 0.9,
    penumbra: 0.28,
    strength: 860,
    tint: '#e0d0b2',
    range: 15,
    shadow: true,
  },
  // The planet’s glow, rising from the crater, throws the orbital sculpture’s shadow onto the ceiling.
  planet_glow: {
    position: [5.37, 1.02, -0.19],
    strength: 216,
    tint: '#64bfb5',
    range: 20,
    decay: 1.25,
    shadow: true,
  },
  ember: {
    position: [6, 2.6, 6.15],
    strength: 27,
    tint: '#af7e5f',
    range: 15,
    decay: 1,
  },
  // Over the upper flight of the stairway up to the Antechamber.
  stairs: {
    position: [24.55, 6.72, -4.98],
    strength: 30,
    tint: '#8ad6cd',
    range: 15,
    decay: 1,
  },
} satisfies Record<string, Lamp>
