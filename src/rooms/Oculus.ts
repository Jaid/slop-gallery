import lowerGallery from '#src/lib/gallery/lowerGallery.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

const {oculus} = lowerGallery

export default class Oculus extends Room {
  override readonly description = 'Borrowed light from the gallery above.'
  // Up to the ceiling’s underside, not the upper room’s walkable surface.
  override readonly fence = floorBox(oculus.size, 0, oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY)
  override readonly id = 'oculus'
  override readonly origin = floorOrigin(oculus, oculus.floorY)
  override readonly spawn = southSpawn(oculus.size)

  constructor() {
    super({
      title: 'Oculus',
      // Green, blue and red, from the sealed tunnel’s north end up to its high south end, each hanging 35 cm under its housing.
      lamps: {
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
      },
      slots: {
        'oculus-south-0': {
          wallId: 'oculus-south',
          ratio: '3:2',
          area: 60_000,
          position: [6.6, 4.85, 9.78],
          rotation: Math.PI,
          labelAbove: true,
        },
        'oculus-south-1': {
          wallId: 'oculus-south',
          ratio: '3:2',
          area: 60_000,
          position: [-6.6, 4.85, 9.78],
          rotation: Math.PI,
          labelAbove: true,
        },
        'oculus-north-0': {
          wallId: 'oculus-north',
          ratio: '3:2',
          area: 30_000,
          position: [-5.6, 8.3, -9.78],
          rotation: 0,
        },
        'oculus-north-1': {
          wallId: 'oculus-north',
          ratio: '3:2',
          area: 30_000,
          position: [5.6, 8.3, -9.78],
          rotation: 0,
        },
        'oculus-east-0': {
          wallId: 'oculus-east',
          ratio: '3:2',
          area: 30_000,
          position: [8.78, 8.15, -8],
          rotation: -Math.PI / 2,
        },
        'oculus-west-0': {
          wallId: 'oculus-west',
          ratio: '3:2',
          area: 30_000,
          position: [-8.78, 8.15, -8],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
