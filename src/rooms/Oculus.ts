import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room<'oculus'> {
  constructor() {
    super({
      id: 'oculus',
      number: 7,
      title: 'Oculus',
      description: 'Borrowed light from the gallery above.',
      origin: floorOrigin(oculus, oculus.floorY),
      // Up to the ceiling’s underside, not the upper room’s walkable surface.
      fence: floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY),
      spawn: southSpawn(oculus.size),
      // Green, blue and red, from the sealed tunnel’s north end up to its high south end, each hanging 35 cm under its housing.
      lamps: {
        'tunnel-green': {
          position: [0, 3.9853, 14.8027],
          strength: 10,
          tint: '#4dff6a',
          range: 14,
          decay: 1.25,
          shadow: true,
        },
        'tunnel-blue': {
          position: [0, 4.7544, 19.8027],
          strength: 13.2,
          tint: '#4d7aff',
          range: 10,
          decay: 1,
        },
        'tunnel-red': {
          position: [0, 5.5235, 24.8027],
          strength: 33,
          tint: '#ff4d4d',
          range: 17,
          decay: 1.5,
          shadow: true,
        },
      },
    })
  }
}
