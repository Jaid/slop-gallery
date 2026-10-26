import type {Lamp} from './base/Room.ts'

import lobby from '#src/lib/gallery/lobby.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'

import Room, {floorBox, floorOrigin, southSpawn} from './base/Room.ts'

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

export default class Lobby extends Room<'lobby'> {
  constructor() {
    super({
      id: 'lobby',
      number: 1,
      title: 'Lobby',
      description: 'Nothing here is quite as it seems.',
      origin: floorOrigin(plan, 0),
      // Up to the crown of the vault.
      fence: floorBox(plan, 0, lobbyVault.springY + lobbyVault.outerRadius),
      spawn: southSpawn(plan, 0),
      // One under each of the vault’s three chandeliers, hung below the hub to reach past the candle ring.
      lamps: {
        'chandelier-north': chandelier(-8),
        'chandelier-middle': chandelier(0),
        'chandelier-south': chandelier(8),
      },
    })
  }
}
