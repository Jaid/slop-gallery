import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room<'oculus'> {
  constructor() {
    super({
      id: 'oculus',
      number: 7,
      title: 'Oculus',
      description: 'Borrowed light from the gallery above.',
      // Up to the ceiling’s underside, not the upper room’s walkable surface.
      fence: floorBox(oculus, oculus.floorY, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY),
      spawn: southSpawn(oculus, oculus.floorY),
    })
  }
}
