import {daydream} from './daydream.ts'
import {lowerGallery} from './lowerGallery.ts'

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
  const movedNorthWall = portrait.hung === true && portrait.wallId === 'daydream-north' && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && Math.abs(position[2] - (daydream.previousNorthZ + 0.22)) <= 0.025
  const movedUndertone = Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && position[0] >= 12 && position[0] <= 24 && position[2] >= 8 && position[2] <= 22 && position[1] >= -4.6 && position[1] <= 2.4 && (portrait.hung === false || typeof portrait.wallId === 'string' && /^undertone-(east|north|south|west)$/u.test(portrait.wallId))
  let migratedPosition = position
  if (movedNorthWall) {
    migratedPosition = [position[0], position[1], position[2] + daydream.northZ - daydream.previousNorthZ]
  } else if (portrait.hung === true && portrait.wallId === 'glasswell-north' && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value)) && [-25.78, -27.78].some(z => Math.abs(position[2] - z) <= 0.025)) {
    migratedPosition = [position[0], position[1], lowerGallery.glasswell.center[1] - lowerGallery.glasswell.size[1] / 2 + 0.22]
  } else if (portrait.hung === true && ['glasswell-east', 'glasswell-west'].includes(String(portrait.wallId)) && Array.isArray(position) && position.length === 3 && position.every(value => typeof value === 'number' && Number.isFinite(value))) {
    const side = portrait.wallId === 'glasswell-west' ? -1 : 1
    if (Math.abs(position[0] - side * 5.78) <= 0.025) {
      migratedPosition = [position[0] + side * (lowerGallery.glasswell.size[0] / 2 - 6), position[1], position[2]]
    }
  } else if (movedUndertone) {
    migratedPosition = [position[0] + lowerGallery.undertone.center[0] - lowerGallery.undertone.previousCenter[0], position[1] + lowerGallery.floorY - lowerGallery.undertone.previousFloorY, position[2] + lowerGallery.undertone.center[1] - lowerGallery.undertone.previousCenter[1]]
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
