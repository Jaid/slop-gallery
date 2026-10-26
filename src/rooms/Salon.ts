import salon from '#src/lib/gallery/salon.ts'

import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

export default class Salon extends Room<'salon'> {
  constructor() {
    super({
      id: 'salon',
      number: 10,
      title: 'The Salon',
      description: 'Hung frame to frame. Judged elbow to elbow.',
      // Lit through its skylight, without lamps of its own.
      origin: floorOrigin(salon, 0),
      fence: floorBox(salon.size, 0, 5.8),
      spawn: southSpawn(salon.size),
    })
  }
}
