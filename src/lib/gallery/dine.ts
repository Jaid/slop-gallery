import type {RoomId} from './types.ts'
import type {Wall} from './walls.ts'
import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'

import {wallFace, wallOpeningTrim} from './architectureDimensions.ts'
import {rooms} from './walls.ts'

const dine = rooms.find(room => room.id === 'dine')!

/** Underside of the 18 cm ceiling slab every upper-floor room gets at 5.78 m. */
export const dineCeilingUnderside = 5.78 - 0.18 / 2

/**
 * Knottingham LED panes in a 2 × 4 grid of 5.5 m squares, symmetric about the room center. The offsets leave about 1.9 m to the
 * side walls and 2.4 m to the end walls.
 */
const dineLedGrid = {
  x: [-2.75, 2.75],
  z: [-8.25, -2.75, 2.75, 8.25],
}

/** Each pane lights the room through one point light hung just below its diffuser. */
export const dineLedLight = {
  /** distance below the pane’s origin, close enough that the brightest ceiling spot stays hidden behind the housing */
  drop: 0.32,
  color: '#eee3ff',
  // Eight of these match the mean floor and wall irradiance of the 32 cd lights behind the old light boxes, one per 8 m of room.
  intensity: 14,
  distance: 14,
  decay: 2,
}

// Like Knottingham, the housing’s top sits 5 mm into the slab so no light leaks between them.
const slotY = dineCeilingUnderside + 0.005 - knotLightHousingY - knotLightHousingSize[1] / 2
/** Breakable LED panes under a room’s ceiling slab, one at each pair of the grid’s offsets from the room center. */
function ceilingLedSlots(roomId: RoomId, grid: {
  x: ReadonlyArray<number>
  z: ReadonlyArray<number>
}): ReadonlyArray<KnotLightSlot> {
  const room = rooms.find(candidate => candidate.id === roomId)!
  return grid.z.flatMap((z, row) => grid.x.map((x, slot) => ({
    id: `${row}:${slot}`,
    position: [room.center[0] + x, slotY, room.center[1] + z],
    row,
    slot,
  })))
}

export const dineLedSlots = ceilingLedSlots('dine', dineLedGrid)

/** The Antechamber’s single pane, centered on its ceiling. */
export const antechamberLedSlots = ceilingLedSlots('antechamber', {
  x: [0],
  z: [0],
})
export const antechamberLedLight = {
  ...dineLedLight,
  // Matches the mean floor and wall irradiance of the 32 cd light behind the old light box.
  intensity: 36,
}

/** Edge length of Dine’s checkered marble tiles, laid from the room’s north-west corner: 12 × 24 whole tiles fill the floor. */
export const dineFloorTile = 1
/** the room’s north-west corner in world x/z, where the tile grid starts */
export const dineFloorOrigin = [dine.center[0] - dine.size[0] / 2, dine.center[1] - dine.size[1] / 2] as const

/** A rectangle on a wall, in its local coordinates: `u` along the wall from its center, `v` up from its floor, both in meters. */
export type WallRectangle = {
  u: readonly [number, number]
  v: readonly [number, number]
}

/**
 * Gilded boiserie on Dine’s painted walls, after the mockup: tall picture-frame panels above a chair rail, and a dado painted a
 * shade deeper below it. The dado between the 44 cm baseboard and the rail is too low for panels of its own; they would only
 * stack more gilt lines over the baseboard cap. All heights are measured from the floor, in meters.
 */
export const dineBoiserie = {
  /** depth of the side walls’ faces, which take this much off both ends of every wall */
  corner: wallFace,
  /** room left between a corner and the first panel */
  cornerMargin: 0.38,
  /** room left between a doorway’s trim and the panels beside it */
  openingMargin: 0.34,
  /** gap between neighboring panels */
  gap: 0.36,
  /** no panel gets longer than this; longer runs are split into equal panels */
  maximumLength: 5.2,
  /**
   * the chair rail’s band; like the Salon’s, it stays low enough that the placards of the shipped frames clear it, and a
   * placard can only overlap it where a visitor hangs a work right down at the lowest allowed height
   */
  rail: [0.74, 0.79] as const,
  /** bottom and top of the panels; their tops stay a hand’s width under the cornice’s gilt band at 5.03 m */
  upper: [0.98, 4.76] as const,
  /** half the width of the gilt molding that frames each panel */
  moldingHalfWidth: 0.026,
  /** how far the molding stands proud of the plaster, for shading only */
  moldingDepth: 0.014,
} as const

/** Wall-local runs, from corner to corner, that are not taken by a doorway and its trim, each shortened by the given margins. */
export function freeWallRuns(wall: Pick<Wall, 'holes' | 'width'>, {corner: cornerMargin, opening: openingMargin}: {
  corner: number
  opening: number
} = {
  corner: dineBoiserie.cornerMargin,
  opening: dineBoiserie.openingMargin,
}) {
  const start = -wall.width / 2 + dineBoiserie.corner + cornerMargin
  const end = wall.width / 2 - dineBoiserie.corner - cornerMargin
  const blocked = (wall.holes ?? []).filter(hole => !hole.bottom).map(hole => [hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, hole.u + hole.width / 2 + wallOpeningTrim + openingMargin] as const).toSorted((a, b) => a[0] - b[0])
  const runs: Array<readonly [number, number]> = []
  let cursor = start
  for (const [left, right] of blocked) {
    if (left > cursor) {
      runs.push([cursor, Math.min(left, end)])
    }
    cursor = Math.max(cursor, right)
  }
  if (end > cursor) {
    runs.push([cursor, end])
  }
  // A sliver beside a doorway is left as plain plaster.
  return runs.filter(([left, right]) => right - left >= 0.6)
}

/**
 * The boiserie of one of Dine’s walls, in wall-local coordinates: every free run is split into equal panels, and the chair rail
 * runs from corner to corner, stopping only at doorway trim.
 */
export function dineWallPanels(wall: Pick<Wall, 'holes' | 'width'>) {
  const {gap, maximumLength, rail, upper} = dineBoiserie
  const columns = freeWallRuns(wall).flatMap(([left, right]) => {
    const count = Math.ceil((right - left + gap) / (maximumLength + gap))
    const length = (right - left - gap * (count - 1)) / count
    return Array.from({length: count}, (_, index) => [left + index * (length + gap), left + index * (length + gap) + length] as const)
  })
  return {
    upper: columns.map((u): WallRectangle => ({
      u,
      v: upper,
    })),
    rails: freeWallRuns(wall, {
      corner: 0,
      opening: 0,
    }).map((u): WallRectangle => ({
      u,
      v: rail,
    })),
  }
}
