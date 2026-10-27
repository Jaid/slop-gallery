import type {Lamp} from './base/Room.ts'

import FountainAmbience from '#src/lib/audio/ambience/Fountain.ts'
import lobby from '#src/lib/gallery/lobby.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

const plan = {
  center: [0, (lobby.northZ + lobby.southZ) / 2],
  size: [lobby.width, lobby.southZ - lobby.northZ],
} as const
const chandelier = (z: number) => ({
  position: [0, 6.6, z],
  strength: 7.2,
  tint: '#ffd27a',
  range: 15,
}) satisfies Lamp

export default class Lobby extends Room {
  override readonly description = 'Nothing here is quite as it seems.'
  // Up to the crown of the vault.
  override readonly fence = floorBox(plan.size, 0, lobbyVault.springY + lobbyVault.outerRadius)
  override readonly id = 'lobby'
  override readonly origin = floorOrigin(plan, 0)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      title: 'Lobby',
      ambience: {
        // From the finial’s tip, the main jet’s mouth.
        fountain: {
          emitter: FountainAmbience,
          position: [0, 3.02, 0],
        },
      },
      // One under each of the vault’s three chandeliers, hung below the hub to reach past the candle ring.
      lamps: {
        chandelier_north: chandelier(-8),
        chandelier_middle: chandelier(0),
        chandelier_south: chandelier(8),
      },
      slots: {
        'lobby-north-0': {
          wallId: 'lobby-north',
          ratio: '2:3',
          area: 30_000,
          position: [-3.6, 2.7, -19.78],
          rotation: 0,
        },
        'lobby-north-1': {
          wallId: 'lobby-north',
          ratio: '2:3',
          area: 30_000,
          position: [3.6, 2.7, -19.78],
          rotation: 0,
        },
        'lobby-east-0': {
          wallId: 'lobby-east',
          ratio: '2:3',
          area: 30_000,
          priority: 100,
          position: [7.78, 2.7, 9.2],
          rotation: -Math.PI / 2,
        },
        'lobby-west-0': {
          wallId: 'lobby-west',
          ratio: '2:3',
          area: 30_000,
          priority: 100,
          position: [-7.78, 2.7, 9.2],
          rotation: Math.PI / 2,
        },
        'lobby-south-0': {
          wallId: 'lobby-south',
          ratio: '1:1',
          area: 60_000,
          position: [4.6, 2.7, 19.78],
          rotation: Math.PI,
        },
        'lobby-south-1': {
          wallId: 'lobby-south',
          ratio: '1:1',
          area: 60_000,
          position: [-4.6, 2.7, 19.78],
          rotation: Math.PI,
        },
        'lobby-extension-east-0': {
          wallId: 'lobby-extension-east',
          ratio: '3:2',
          area: 30_000,
          priority: 100,
          position: [7.78, 2.7, 0],
          rotation: -Math.PI / 2,
        },
        'lobby-extension-west-0': {
          wallId: 'lobby-extension-west',
          ratio: '3:2',
          area: 30_000,
          priority: 100,
          position: [-7.78, 2.7, 0],
          rotation: Math.PI / 2,
        },
      },
    })
  }
}
