import salon from '#src/lib/gallery/salon.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

export default class Salon extends Room<'salon'> {
  constructor() {
    super({
      id: 'salon',
      number: 10,
      title: 'The Salon',
      description: 'Hung frame to frame. Judged elbow to elbow.',
      fence: floorBox(salon, 0, 5.8),
      spawn: southSpawn(salon, 0),
    })
  }
}
