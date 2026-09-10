import type {Vec3} from './types.ts'

import {lobby} from './lobby.ts'
import {lowerGallery} from './lowerGallery.ts'
import {moonfallRecovery} from './moonfall/config.ts'
import {Passage} from './passages/Passage.ts'
import {StairFlight, stairHeadroom} from './stairs/StairFlight.ts'
import {insideGallery} from './walls.ts'

// Preserve loose frames from the first Lodge layout after moving its return route west.
const retiredLodgePassages = [
  new Passage('retired-lodge-approach', 'lodge', [[-25, -26], [-25, -2]], -5),
  new Passage('retired-lodge-landing', 'lodge', [[-25, 7.6], [-25, 9.65], [-20, 9.65]], 0),
]
const retiredLodgeStairs = new StairFlight('retired-lodge', [-25, 0, 7.6], [-25, -5, -2], 2.6, 28, 0.55, 0.55, 'lodge')
const inRetiredLodgeRoute = (position: Vec3) => retiredLodgePassages.some(passage => passage.contains(position)) || retiredLodgeStairs.blocks.some(block => Math.abs(position[0] - block.position[0]) <= block.size[0] / 2 && Math.abs(position[2] - block.position[2]) <= block.size[2] / 2 && position[1] >= block.top - 1 && position[1] <= block.top + stairHeadroom)
// Resolve renamed defaults when loading existing collections and backups.
const aliases = [
  ['goose', 'goose', 'work-0.webp'],
  ['orange', 'orange', 'work-1.webp'],
  ['doge', 'dog', 'doge-velvet.webp'],
  ['doge-neon', 'wolf', 'doge-neon.webp'],
  ['dog-neon', 'wolf', 'dog-neon.webp'],
  ['cloud', 'tree', 'work-3.webp'],
  ['pigeon', 'pigeon', 'pigeon-mona.png'],
  ['golden', 'toast', 'golden-crispness.webp', 'golden-crispness.opus'],
  ['catgalaxy', 'cat', 'cat-galaxy.webp', 'cat-galaxy.opus'],
  ['fruit', 'fruit', 'algorithm-fruit.webp'],
  ['ghosts', 'ghosts', 'ghost-banquet.avif'],
  ['shrimpman', 'shrimp', 'shrimpman.webp', 'shrimpman.opus'],
  ['rubberduck', 'duck', 'rubber-duck-ascension.webp', 'rubber-duck-ascension.opus'],
  ['sourdough', 'bread', 'sourdough-soliloquy.webp', 'sourdough-soliloquy.opus'],
  ['frogmona', 'frog', 'frog-mona.webp', 'frog-mona.opus'],
  ['petalroom', 'flower', 'petal-room.webp', 'petal-room.opus'],
  ['lobster', 'lobster', 'work-2.webp'],
] as const
const ids = new Map<string, string>
const images = new Map<string, string>
const narrations = new Map<string, string>
for (const [oldId, id, image, narration] of aliases) {
  ids.set(oldId, id)
  images.set(`/art/${image}`, `/art/${id}${image.slice(image.lastIndexOf('.'))}`)
  if (narration) {
    narrations.set(`/audio/${narration}`, `/audio/${id}.opus`)
  }
}

export function migratePortrait(portrait: Record<string, unknown>) {
  const position = portrait.position
  const movedNorthWall = portrait.hung === true && portrait.wallId === 'lobby-north' && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && Math.abs(position[2] - (lobby.previousNorthZ + 0.22)) <= 0.025
  const movedMoonfall = Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && position[0] >= 12 && position[0] <= 24 && position[2] >= 8 && position[2] <= 22 && position[1] >= -4.6 && position[1] <= 2.4 && (portrait.hung === false && !insideGallery(position as Vec3) || portrait.hung === true && typeof portrait.wallId === 'string' && /^moonfall-(east|north|south|west)$/u.test(portrait.wallId))
  let migratedPosition = position
  if (portrait.hung === false && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && !insideGallery(position as Vec3) && inRetiredLodgeRoute(position as Vec3)) {
    migratedPosition = [-25, -4.8, -28.5]
  } else if (movedNorthWall) {
    migratedPosition = [position[0], position[1], position[2] + lobby.northZ - lobby.previousNorthZ]
  } else if (portrait.hung === true && portrait.wallId === 'oculus-north' && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && [-25.78, -27.78].some(z => Math.abs(position[2] - z) <= 0.025)) {
    migratedPosition = [position[0], position[1], lowerGallery.oculus.center[1] - lowerGallery.oculus.size[1] / 2 + 0.22]
  } else if (portrait.hung === true && ['oculus-east', 'oculus-west'].includes(String(portrait.wallId)) && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value))) {
    const side = portrait.wallId === 'oculus-west' ? -1 : 1
    if (Math.abs(position[0] - side * 5.78) <= 0.025) {
      migratedPosition = [position[0] + side * (lowerGallery.oculus.size[0] / 2 - 6), position[1], position[2]]
    }
  } else if (movedMoonfall) {
    migratedPosition = [position[0] + lowerGallery.moonfall.compactCenter[0] - lowerGallery.moonfall.previousCenter[0], position[1] + lowerGallery.floorY - lowerGallery.moonfall.previousFloorY, position[2] + lowerGallery.moonfall.compactCenter[1] - lowerGallery.moonfall.previousCenter[1]]
  }
  if (portrait.hung === true && Array.isArray(migratedPosition) && migratedPosition.length === 3 && migratedPosition.every(value => typeof value === 'number' && Number.isFinite(value))) {
    const [x, y, z] = migratedPosition as Vec3
    // The expanded hall keeps its north and east entrances. Move the other two
    // hanging surfaces once, preserving each painting's coordinate along its wall.
    if (portrait.wallId === 'moonfall-west' && Math.abs(x - (lowerGallery.moonfall.compactCenter[0] - lowerGallery.moonfall.compactSize[0] / 2 + 0.22)) <= 0.025) {
      migratedPosition = [lowerGallery.moonfall.center[0] - lowerGallery.moonfall.size[0] / 2 + 0.22, y, z]
    } else if (portrait.wallId === 'moonfall-south' && Math.abs(z - (lowerGallery.moonfall.compactCenter[1] + lowerGallery.moonfall.compactSize[1] / 2 - 0.22)) <= 0.025) {
      migratedPosition = [x, y, lowerGallery.moonfall.center[1] + lowerGallery.moonfall.size[1] / 2 - 0.22]
    }
  }
  // Art on the removed plinth's old floor recovers on the public side of the fence.
  if (movedMoonfall && portrait.hung === false) {
    migratedPosition = [...moonfallRecovery]
  }
  return {
    ...portrait,
    // Preserve custom hanging positions too, without moving loose or already migrated art.
    position: migratedPosition,
    wallId: typeof portrait.wallId === 'string' ? portrait.wallId.replace(/^secret-(east|north|south|west)$/u, 'antechamber-$1') : portrait.wallId,
    id: typeof portrait.id === 'string' ? ids.get(portrait.id) ?? portrait.id : portrait.id,
    source: typeof portrait.source === 'string' ? images.get(portrait.source) ?? portrait.source : portrait.source,
    narration: typeof portrait.narration === 'string' ? narrations.get(portrait.narration) ?? portrait.narration : portrait.narration,
  }
}
