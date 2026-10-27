import type {Lamp} from '../base/Room.ts'

const wallLed = {
  tint: '#91c9c4',
} as const
const westWallLed = (z: number) => ({
  ...wallLed,
  position: [-13.225, 2.8, z],
  strength: 5,
  range: 6,
}) satisfies Lamp
const eastWallLed = (z: number) => ({
  ...wallLed,
  position: [13.225, 2.2, z],
  strength: 15,
  range: 10,
}) satisfies Lamp

export default {
  // Four wall LEDs down the west wall, leaving its middle dark.
  wall_west_1: westWallLed(-10),
  wall_west_2: westWallLed(-5),
  wall_west_3: westWallLed(5),
  wall_west_4: westWallLed(10),
  // On the east only the pair flanking the stair door, hanging lower and brighter.
  wall_east_north: eastWallLed(-3.6),
  wall_east_south: eastWallLed(3.6),
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
// Green, blue and red, from the sealed tunnel’s north end up to its high south end, each hanging 35 cm under its housing.
  tunnel_green: {
    position: [8, 0.9853, -28.6973],
    strength: 10,
    tint: '#4dff6a',
    range: 14,
    decay: 1.25,
    shadow: true,
  },
  tunnel_blue: {
    position: [8, 1.7544, -23.6973],
    strength: 13.2,
    tint: '#4d7aff',
    range: 10,
    decay: 1,
  },
  tunnel_red: {
    position: [8, 2.5235, -18.6973],
    strength: 33,
    tint: '#ff4d4d',
    range: 17,
    decay: 1.5,
    shadow: true,
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
