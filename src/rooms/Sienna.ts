import Room, {floorBox, southSpawn} from './base/Room.ts'

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
      fence: floorBox(plan, 0, 5.8),
      spawn: southSpawn(plan, 0),
    })
  }
}
