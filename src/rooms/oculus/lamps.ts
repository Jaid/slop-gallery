import type {Lamp} from '../base/Room.ts'

// Green, blue and red, from the sealed tunnel’s north end up to its high south end, each hanging 35 cm under its housing.
export default {
  tunnel_green: {
    position: [0, 3.9853, 14.8027],
    strength: 10,
    tint: '#4dff6a',
    range: 14,
    decay: 1.25,
    shadow: true,
  },
  tunnel_blue: {
    position: [0, 4.7544, 19.8027],
    strength: 13.2,
    tint: '#4d7aff',
    range: 10,
    decay: 1,
  },
  tunnel_red: {
    position: [0, 5.5235, 24.8027],
    strength: 33,
    tint: '#ff4d4d',
    range: 17,
    decay: 1.5,
    shadow: true,
  },
} satisfies Record<string, Lamp>
