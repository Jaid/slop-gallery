import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

const plan = {
  center: [-14, 14],
  size: [12, 12],
} as const

export default class Sienna extends Room<'sienna'> {
  constructor() {
    super({
      id: 'sienna',
      number: 5,
      title: 'The Sienna',
      description: 'Low light. Rich textures. Questionable company.',
      origin: floorOrigin(plan, 0),
      fence: floorBox(plan.size, 0, 5.8),
      spawn: southSpawn(plan.size),
      lamps: {
        // Below the swinging chandelier’s metalwork at rest, so the fixture can’t shadow its own source.
        chandelier: {
          position: [0, 3.05, 0],
          strength: 110,
          tint: '#ffd36c',
          range: 15,
          decay: 1.75,
          shadow: true,
        },
      },
    })
  }
}
