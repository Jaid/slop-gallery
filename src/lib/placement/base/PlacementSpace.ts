import type {Placement, Portrait, Vec3} from '../../gallery/types.ts'
import type {Wall} from '../wallGeometry.ts'

import {clamp} from 'math'

import {insideOpening, placementIssue, placementIssues, placementReach, wallCoordinates, wallPosition, wallRayDistance} from '../wallGeometry.ts'

/** something in front of the walls that a placement ray stops at, like a pane of glass */
export type PlacementObstruction = {
  /** in multiples of the ray direction */
  distance: number
  placement: Placement
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const finiteVector = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
/** Saved artworks that look complete enough to move; anything else is left for validation to judge. */
const movable = (value: unknown): value is Portrait => record(value) && typeof value.id === 'string' && typeof value.hung === 'boolean' && finiteVector(value.position) && typeof value.width === 'number' && typeof value.height === 'number' && Number.isFinite(value.width) && Number.isFinite(value.height)

/**
 * Where a level lets artworks hang and land: its walls, its floor and its volume.
 *
 * Every level supplies one as the default export of `#level/placement.ts`. Dragging, placing, throwing, importing, persistence and the artwork bodies all ask it instead of a particular level’s architecture.
 */
export abstract class PlacementSpace {
  readonly reach = placementReach
  /** where artworks reappear after falling out of the level or after their saved spot stopped existing */
  abstract readonly recoveryPosition: Vec3
  /** every wall that a placement ray can hit, hangable or not */
  abstract readonly walls: ReadonlyArray<Wall>
  private wallIndex: Map<string, Wall> | undefined

  /** whether an artwork, hung or loose, may be at this position */
  abstract contains(position: Vec3): boolean
  /** The wall an artwork aimed along this ray would hang on, with whether and why not it fits there, or `null` if the ray hits no wall. */
  findPlacement(origin: Vec3, direction: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = ''): Placement | null {
    const obstruction = this.obstruction(origin, direction)
    let nearest = obstruction?.distance ?? Infinity
    let result = obstruction?.placement ?? null
    const length = Math.hypot(...direction)
    for (const candidateWall of this.walls) {
      const distance = wallRayDistance(candidateWall, origin, direction)
      if (distance < 0 || distance >= nearest) {
        continue
      }
      const point: Vec3 = [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance]
      const u = wallCoordinates(candidateWall, point)
      const base = candidateWall.center[1] + u * (candidateWall.slope ?? 0)
      if (Math.abs(u) > candidateWall.width / 2 || point[1] < base || point[1] > base + candidateWall.height) {
        continue
      }
      if (candidateWall.holes?.some(hole => !hole.glassThickness && insideOpening(hole, u, point[1] - candidateWall.center[1]))) {
        continue
      }
      nearest = distance
      const position = wallPosition(candidateWall, u, point[1])
      const inReach = distance * length <= this.reach
      const reason = inReach ? this.placementIssue(candidateWall, position, width, height, portraits, ignoreId) : placementIssues.reach
      result = {
        inReach,
        position,
        rotation: candidateWall.rotation - (candidateWall.curveRadius ? u / candidateWall.curveRadius : 0),
        wallId: candidateWall.id,
        valid: !reason,
        reason,
      }
    }
    return result
  }

  /** height of the walkable floor under a position */
  abstract floorHeight(position: Vec3): number

  /** Something in front of the walls that stops a placement ray first. */
  protected obstruction(_origin: Vec3, _direction: Vec3): PlacementObstruction | null {
    return null
  }

  /** Why an artwork of this size cannot hang centered at `position` on a wall, or an empty string if it can. */
  placementIssue(targetWall: Wall, position: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = '', labelAbove = false) {
    return placementIssue(targetWall, position, width, height, portraits, ignoreId, labelAbove)
  }

  /**
   * Brings stored artworks, before validation, in line with the level’s current walls. Hung works are snapped back onto their wall; works whose wall or spot no longer fits come down and stand in front of it, and loose works outside the level return to the recovery position.
   *
   * Returns the same array if nothing had to move. Malformed entries are returned untouched for validation to reject.
   */
  settle(portraits: ReadonlyArray<unknown>): ReadonlyArray<unknown> {
    const hung: Array<Portrait> = []
    let recovered = 0
    const settled = portraits.map(value => {
      if (!movable(value)) {
        return value
      }
      let portrait = value
      if (portrait.hung) {
        const targetWall = typeof portrait.wallId === 'string' ? this.wall(portrait.wallId) : undefined
        if (targetWall) {
          const u = wallCoordinates(targetWall, portrait.position)
          const position = wallPosition(targetWall, u, portrait.position[1])
          if (!this.placementIssue(targetWall, position, portrait.width, portrait.height, hung, portrait.id, portrait.labelAbove)) {
            const rotation = targetWall.rotation - (targetWall.curveRadius ? u / targetWall.curveRadius : 0)
            const aligned = !portrait.orientation && Math.hypot(...position.map((n, i) => n - portrait.position[i])) < 1e-6 && Math.abs(Math.sin((portrait.rotation - rotation) / 2)) < 1e-9
            portrait = aligned ? portrait : {
              ...portrait,
              position,
              rotation,
              orientation: undefined,
            }
            hung.push(portrait)
            return portrait
          }
        }
        portrait = this.takeDown(portrait, targetWall)
      }
      if (!this.contains(portrait.position)) {
        portrait = {
          ...portrait,
          position: [this.recoveryPosition[0], this.recoveryPosition[1] + 0.2 * (recovered++ % 8), this.recoveryPosition[2]],
          orientation: undefined,
        }
      }
      return portrait
    })
    return settled.some((portrait, index) => portrait !== portraits[index]) ? settled : portraits
  }

  wall(id: string) {
    this.wallIndex ??= new Map(this.walls.map(candidate => [candidate.id, candidate]))
    return this.wallIndex.get(id)
  }

  /** The artwork standing on the floor in front of the wall it can no longer hang on. */
  private takeDown(portrait: Portrait, targetWall: Wall | undefined): Portrait {
    const loose: Portrait = {
      ...portrait,
      hung: false,
      wallId: undefined,
      orientation: undefined,
    }
    if (!targetWall) {
      return loose
    }
    const margin = Math.max(0, targetWall.width / 2 - 1)
    const u = clamp(wallCoordinates(targetWall, portrait.position), -margin, margin)
    const ground = wallPosition(targetWall, u, 0, 0.9)
    return {
      ...loose,
      position: wallPosition(targetWall, u, this.floorHeight([ground[0], targetWall.center[1] + 1, ground[2]]) + portrait.height / 2 + 0.05, 0.9),
      rotation: targetWall.rotation,
    }
  }
}
