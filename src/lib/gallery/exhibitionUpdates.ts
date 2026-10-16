import type {Portrait, Vec3} from './types.ts'

import initialPortraits from './collection.ts'
import {maximumPortraits} from './imagePolicy.ts'
import walls, {placementIssue, wallCoordinates, wallPosition} from './walls.ts'

type ExhibitionUpdate = {
  /** artworks of the shipped collection that first appeared with this update */
  artworks: ReadonlyArray<string>
  /** walls that gained a walk-through opening; saved artworks in its way are moved along the wall */
  openedWalls: ReadonlyArray<string>
}

/** Changes to the shipped exhibition that saved collections have to catch up with, oldest first. */
export const exhibitionUpdates: ReadonlyArray<ExhibitionUpdate> = [
  {
    artworks: ['raft', 'hamster', 'noodles', 'onion', 'wave', 'venus', 'walrus', 'penguins', 'alpacas', 'raccoons', 'wanderer', 'scream', 'corgi', 'swing', 'kiss', 'gleaners', 'gnomes', 'otter', 'jatte'],
    openedWalls: ['dine-north'],
  },
]
export const exhibitionRevision = exhibitionUpdates.length

const doorwayIssue = 'Let’s keep the doorway clear.'
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const finiteVector = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
/** Saved artworks that look complete enough to measure; anything else is left for validation to judge. */
const measurable = (value: unknown): value is Portrait => record(value) && typeof value.id === 'string' && finiteVector(value.position) && typeof value.width === 'number' && typeof value.height === 'number' && Number.isFinite(value.width) && Number.isFinite(value.height)
/**
 * Brings a stored collection, before validation, up to date with the shipped exhibition: works in the way of a new doorway move
 * aside along their wall, and newly shipped works join it if there is room. Updates a collection has already received are
 * skipped, so works removed afterwards stay removed. Malformed input is returned untouched for validation to reject.
 */
export function upgradeDocument(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.portraits) || value.version !== 1) {
    return value
  }
  const received = value.exhibition ?? 0
  if (typeof received !== 'number' || !Number.isInteger(received) || received < 0 || received >= exhibitionRevision) {
    return value
  }
  let portraits = [...value.portraits as Array<unknown>]
  for (const update of exhibitionUpdates.slice(received)) {
    const measured = () => portraits.filter(measurable)
    portraits = portraits.map(portrait => {
      if (!measurable(portrait) || !portrait.hung || !update.openedWalls.includes(portrait.wallId ?? '')) {
        return portrait
      }
      const wall = walls.find(candidate => candidate.id === portrait.wallId)!
      return placementIssue(wall, portrait.position, portrait.width, portrait.height, []) === doorwayIssue ? relocate(portrait, measured()) : portrait
    })
    for (const id of update.artworks) {
      const artwork = initialPortraits.find(portrait => portrait.id === id)
      if (!artwork || portraits.length >= maximumPortraits || portraits.some(portrait => record(portrait) && portrait.id === id)) {
        continue
      }
      const wall = walls.find(candidate => candidate.id === artwork.wallId)
      if (wall && !placementIssue(wall, artwork.position, artwork.width, artwork.height, measured(), artwork.id)) {
        portraits.push({
          ...artwork,
          position: [...artwork.position],
        })
      }
    }
  }
  return {
    ...value,
    portraits,
    exhibition: exhibitionRevision,
  }
}

/**
 * The nearest position along its wall where `portrait` hangs without any issue, searching in 5 cm steps. Falls back to standing
 * the work on the floor 60 cm in front of the wall, where the player can pick it up and hang it again.
 */
function relocate(portrait: Portrait, portraits: ReadonlyArray<Portrait>): Portrait {
  const wall = walls.find(candidate => candidate.id === portrait.wallId)!
  const u = wallCoordinates(wall, portrait.position)
  const y = portrait.position[1]
  for (let step = 1; step * 0.05 <= wall.width; step++) {
    for (const side of [-1, 1]) {
      const position = wallPosition(wall, u + side * step * 0.05, y)
      if (!placementIssue(wall, position, portrait.width, portrait.height, portraits, portrait.id)) {
        return {
          ...portrait,
          position,
        }
      }
    }
  }
  return {
    ...portrait,
    hung: false,
    wallId: undefined,
    position: wallPosition(wall, u, wall.center[1] + portrait.height / 2 + 0.05, 0.6),
  }
}
