import Room, {floorBox, southSpawn} from './base/Room.ts'

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
      fence: floorBox(plan, 0, 5.8),
      spawn: southSpawn(plan, 0),
    })
  }
}
