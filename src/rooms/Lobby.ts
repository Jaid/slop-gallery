import lobby from '#src/lib/gallery/lobby.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'

import Room, {floorBox, southSpawn} from './base/Room.ts'

const plan = {
  center: [0, (lobby.northZ + lobby.southZ) / 2],
  size: [lobby.width, lobby.southZ - lobby.northZ],
} as const

export default class Lobby extends Room<'lobby'> {
  constructor() {
    super({
      id: 'lobby',
      number: 1,
      title: 'Lobby',
      description: 'Nothing here is quite as it seems.',
      // Up to the crown of the vault.
      fence: floorBox(plan, 0, lobbyVault.springY + lobbyVault.outerRadius),
      spawn: southSpawn(plan, 0),
    })
  }
}
