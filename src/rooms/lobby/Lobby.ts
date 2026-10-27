import lobby from '#src/lib/gallery/lobby.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'

import Room from '../base/Room.ts'
import floorBox from '../lib/floorBox.ts'
import floorOrigin from '../lib/floorOrigin.ts'
import ambienceEmitters from './ambienceEmitters.ts'
import cameras from './cameras.ts'
import lamps from './lamps.ts'
import slots from './slots.ts'
import spawns from './spawns.ts'
import stickyWalls from './stickyWalls.ts'

const plan = {
  center: [0, (lobby.northZ + lobby.southZ) / 2],
  size: [lobby.width, lobby.southZ - lobby.northZ],
} as const

export default class Lobby extends Room {
  override readonly color = '#c6c7ae'
  override readonly description = 'Nothing here is quite as it seems.'
  // Up to the crown of the vault.
  override readonly fence = floorBox(plan.size, 0, lobbyVault.springY + lobbyVault.outerRadius)
  override readonly floorY = 0
  override readonly id = 'lobby'
  override readonly origin = floorOrigin(plan, this.floorY)
  override readonly spawn = spawns['']

  constructor() {
    super({
      title: 'Lobby',
      cameras,
      spawns,
      ambience: ambienceEmitters,
      lamps,
      slots,
      stickyWalls,
    })
  }
}
