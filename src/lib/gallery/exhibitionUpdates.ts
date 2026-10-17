import type {Wall} from '../placement/wallGeometry.ts'
import type {Portrait, Vec3} from './types.ts'

import placement from '#level/placement.ts'

import {placementIssues, wallCoordinates, wallPosition} from '../placement/wallGeometry.ts'
import initialPortraits from './collection.ts'
import {maximumPortraits} from './imagePolicy.ts'

type ExhibitionUpdate = {
  /** artworks of the shipped collection that first appeared with this update */
  artworks: ReadonlyArray<string>
  /** Walls that moved, with the world offset they moved by. Saved artworks still hanging where the wall used to be move with it. */
  movedWalls?: Readonly<Record<string, Vec3>>
  /** walls that gained an opening, like a doorway or a window; saved artworks in its way are moved along the wall */
  openedWalls: ReadonlyArray<string>
}

/** Changes to the shipped exhibition that saved collections have to catch up with, oldest first. */
export const exhibitionUpdates: ReadonlyArray<ExhibitionUpdate> = [
  {
    artworks: ['raft', 'hamster', 'noodles', 'onion', 'wave', 'venus', 'walrus', 'penguins', 'alpacas', 'raccoons', 'wanderer', 'scream', 'corgi', 'swing', 'kiss', 'gleaners', 'gnomes', 'otter', 'jatte'],
    openedWalls: ['dine-north'],
  },
  {
    // The Salon grew 12 m north to center the glass wall it shares with the Lobby.
    artworks: [],
    movedWalls: {'salon-north': [0, 0, -12]},
    openedWalls: ['lobby-extension-east', 'salon-west'],
  },
]
export const exhibitionRevision = exhibitionUpdates.length

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
    portraits = portraits.map(portrait => (measurable(portrait) ? follow(portrait, update) : portrait))
    portraits = portraits.map(portrait => {
      if (!measurable(portrait) || !portrait.hung || !update.openedWalls.includes(portrait.wallId ?? '')) {
        return portrait
      }
      const wall = placement.wall(portrait.wallId ?? '')
      return wall && placement.placementIssue(wall, portrait.position, portrait.width, portrait.height, []) === placementIssues.doorway ? relocate(portrait, measured()) : portrait
    })
    for (const id of update.artworks) {
      const artwork = initialPortraits.find(portrait => portrait.id === id)
      if (!artwork || portraits.length >= maximumPortraits || portraits.some(portrait => record(portrait) && portrait.id === id)) {
        continue
      }
      const wall = placement.wall(artwork.wallId ?? '')
      if (wall && !placement.placementIssue(wall, artwork.position, artwork.width, artwork.height, measured(), artwork.id)) {
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
 * Lets the level settle the works of a stored collection, before validation, into its current walls and volume, which can change between visits in the halls. Returns the input itself if nothing moved, and malformed input untouched for validation to reject.
 */
export function settleDocument(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.portraits)) {
    return value
  }
  const portraits = placement.settle(value.portraits as Array<unknown>)
  return portraits === value.portraits ? value : {
    ...value,
    portraits,
  }
}

/** The work moved along with its wall, if the wall moved in this update and the work still hangs where the wall used to be. */
function follow(portrait: Portrait, update: ExhibitionUpdate): Portrait {
  const offset = portrait.hung ? update.movedWalls?.[portrait.wallId ?? ''] : undefined
  const wall = offset && placement.wall(portrait.wallId!)
  if (!wall || onWall(wall, portrait.position)) {
    return portrait
  }
  const position = portrait.position.map((value, i) => value + offset[i]) as Vec3
  return onWall(wall, position) ? {
    ...portrait,
    position,
  } : portrait
}
function onWall(wall: Wall, position: Vec3) {
  const expected = wallPosition(wall, wallCoordinates(wall, position), position[1])
  return Math.hypot(...expected.map((value, i) => value - position[i])) <= 0.025
}
/**
 * The nearest position along its wall where `portrait` hangs without any issue, searching in 5 cm steps. Falls back to standing
 * the work on the floor 60 cm in front of the wall, where the player can pick it up and hang it again.
 */
function relocate(portrait: Portrait, portraits: ReadonlyArray<Portrait>): Portrait {
  const wall = placement.wall(portrait.wallId!)!
  const u = wallCoordinates(wall, portrait.position)
  const y = portrait.position[1]
  for (let step = 1; step * 0.05 <= wall.width; step++) {
    for (const side of [-1, 1]) {
      const position = wallPosition(wall, u + side * step * 0.05, y)
      if (!placement.placementIssue(wall, position, portrait.width, portrait.height, portraits, portrait.id)) {
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
