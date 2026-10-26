import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

const plan = {
  center: [-14, 0],
  size: [12, 16],
} as const

export default class Vesper extends Room<'vesper'> {
  constructor() {
    super({
      id: 'vesper',
      number: 2,
      title: 'The Vesper',
      description: 'Old masters. New misunderstandings.',
      origin: floorOrigin(plan, 0),
      fence: floorBox(plan.size, 0, 5.8),
      spawn: southSpawn(plan.size),
      // The two light boxes in the ceiling.
      lamps: {
        'ceiling-north': {
          position: [0, 4.5, -3.5],
          strength: 40,
          tint: '#fff1d8',
          range: 14,
        },
        'ceiling-south': {
          position: [0, 4.5, 3.5],
          strength: 40,
          tint: '#fff1d8',
          range: 14,
        },
      },
    })
  }
}
