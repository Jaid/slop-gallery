import type {GalleryRoomId as RoomId} from '#src/worlds/gallery/index.ts'
import type {Wall} from '../../placement/wallGeometry.ts'
import type {FloorRectangle} from '../floors.ts'
import type {Vec3} from '../types.ts'

import {wallFace} from '../architectureDimensions.ts'
import passageOrientation from './orientation.ts'

export type PassageCutout = {
  position: Vec3
  size: Vec3
}

type Point = readonly [number, number]
type Rectangle = {
  maxX: number
  maxZ: number
  minX: number
  minZ: number
}
type Edge = {
  axis: 0 | 2
  cross: number
  max: number
  min: number
  side: number
}

/**
 * An open-ended, level passage. One footprint drives its floors, walls and navigation.
 * A room made of several passages tells them apart by their ids; one named like its room is the room’s only passage.
 */
export default class Passage {
  readonly floors: Array<FloorRectangle> = []
  /** the floors at the elbows, where two spans overlap */
  readonly junctions: Array<FloorRectangle> = []
  /** the room’s id, followed by the passage’s own unless it is the room’s only one, which its walls’ ids start with */
  readonly name: string
  readonly spans: Array<{
    end: Point
    start: Point
  }> = []
  readonly walls: Array<Wall> = []

  constructor(readonly id: string, readonly room: RoomId, readonly path: ReadonlyArray<Point>, readonly floorY: number, readonly width = 2.6, readonly height = 3.4, readonly cutouts: ReadonlyArray<PassageCutout> = []) {
    if (path.length < 2 || ![floorY, width, height, ...path.flat()].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new RangeError('A passage needs at least two finite points and positive dimensions.')
    }
    if (cutouts.some(cutout => ![...cutout.position, ...cutout.size].every(Number.isFinite) || cutout.size.some(size => size <= 0))) {
      throw new RangeError('Passage cutouts need finite centers and positive dimensions.')
    }
    // Not an accessor: the build bakes the walls’ openings, and its evaluator leaves accessors out.
    this.name = id === room ? id : `${room}-${id}`
    const half = width / 2
    const rectangles: Array<Rectangle> = []
    for (let i = 1; i < path.length; i++) {
      const start = path[i - 1]
      const end = path[i]
      const fixedX = start[0] === end[0]
      const fixedZ = start[1] === end[1]
      if (fixedX === fixedZ) {
        throw new RangeError('Passage segments must follow one horizontal axis.')
      }
      this.spans.push({
        start,
        end,
      })
      const axis = fixedX ? 1 : 0
      const direction = Math.sign(end[axis] - start[axis])
      const from = start[axis] - (i > 1 ? direction * half : 0)
      const to = end[axis] + (i < path.length - 1 ? direction * half : 0)
      rectangles.push(axis === 0 ? {
        minX: Math.min(from, to),
        maxX: Math.max(from, to),
        minZ: start[1] - half,
        maxZ: start[1] + half,
      } : {
        minX: start[0] - half,
        maxX: start[0] + half,
        minZ: Math.min(from, to),
        maxZ: Math.max(from, to),
      })
    }
    // Partition the union, not overlapping slabs with internal collision walls at turns.
    const xs = [...new Set(rectangles.flatMap(r => [r.minX, r.maxX]))].toSorted((a, b) => a - b)
    const zs = [...new Set(rectangles.flatMap(r => [r.minZ, r.maxZ]))].toSorted((a, b) => a - b)
    const covering = (x: number, z: number) => rectangles.filter(r => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ).length
    const occupied = (x: number, z: number) => covering(x, z) > 0
    const edges: Array<Edge> = []
    for (let x = 1; x < xs.length; x++) {
      for (let z = 1; z < zs.length; z++) {
        const minX = xs[x - 1]
        const maxX = xs[x]
        const minZ = zs[z - 1]
        const maxZ = zs[z]
        const cx = (minX + maxX) / 2
        const cz = (minZ + maxZ) / 2
        if (!occupied(cx, cz)) {
          continue
        }
        const floor: FloorRectangle = {
          center: [cx, cz],
          size: [maxX - minX, maxZ - minZ],
        }
        this.floors.push(floor)
        if (covering(cx, cz) > 1) {
          this.junctions.push(floor)
        }
        for (const side of [-1, 1]) {
          const zEdge = side < 0 ? minZ : maxZ
          const xEdge = side < 0 ? minX : maxX
          if (!occupied(cx, zEdge + side * 1e-6)) {
            edges.push({
              axis: 0,
              cross: zEdge,
              min: minX,
              max: maxX,
              side,
            })
          }
          if (!occupied(xEdge + side * 1e-6, cz)) {
            edges.push({
              axis: 2,
              cross: xEdge,
              min: minZ,
              max: maxZ,
              side,
            })
          }
        }
      }
    }
    const ends = [[path[0], path[1]], [path.at(-1)!, path.at(-2)!]] as const
    const closed = edges.filter(edge => !ends.some(([end, neighbor]) => {
      const travel = end[0] === neighbor[0] ? 2 : 0
      const cross = travel === 0 ? 2 : 0
      return edge.axis === cross && Math.abs(edge.cross - end[travel / 2]) < 1e-6 && edge.min >= end[cross / 2] - half - 1e-6 && edge.max <= end[cross / 2] + half + 1e-6
    }))
    const merged: Array<Edge> = []
    for (const edge of closed.toSorted((a, b) => a.axis - b.axis || a.cross - b.cross || a.side - b.side || a.min - b.min)) {
      const previous = merged.at(-1)
      if (previous?.axis === edge.axis && previous.cross === edge.cross && previous.side === edge.side && Math.abs(previous.max - edge.min) < 1e-6) {
        previous.max = edge.max
      } else {
        merged.push({...edge})
      }
    }
    for (const edge of merged) {
      // At the inner corner of an elbow, both walls end on their shared line and leave the square between their faces open, exposing
      // their end caps in the planes where linings and vaults end too. Extending one of the two walls by its thickness closes it.
      if (edge.axis !== 2) {
        continue
      }
      const outside = edge.cross + edge.side * 1e-6
      if (occupied(outside, edge.min - 1e-6)) {
        edge.min -= wallFace
      }
      if (occupied(outside, edge.max + 1e-6)) {
        edge.max += wallFace
      }
    }
    for (const [i, edge] of merged.entries()) {
      const center = (edge.min + edge.max) / 2
      const face = passageOrientation(edge.axis, edge.side)
      const holes = cutouts.flatMap(cutout => {
        const crossAxis = edge.axis === 0 ? 2 : 0
        if (Math.abs(cutout.position[crossAxis] - edge.cross) >= cutout.size[crossAxis] / 2) {
          return []
        }
        const min = Math.max(edge.min, cutout.position[edge.axis] - cutout.size[edge.axis] / 2)
        const max = Math.min(edge.max, cutout.position[edge.axis] + cutout.size[edge.axis] / 2)
        if (min >= max) {
          return []
        }
        return {
          u: ((min + max) / 2 - center) * (edge.axis === 0 ? Math.cos(face.rotation) : -Math.sin(face.rotation)),
          width: max - min,
          bottom: cutout.position[1] - cutout.size[1] / 2 - floorY,
          height: cutout.position[1] + cutout.size[1] / 2 - floorY,
          profile: 'rectangle' as const,
        }
      })
      this.walls.push({
        id: `${this.name}${id === room ? '-' : '_'}wall_${i}`,
        room,
        center: edge.axis === 0 ? [center, floorY, edge.cross] : [edge.cross, floorY, center],
        rotation: face.rotation,
        width: edge.max - edge.min,
        height: height - 0.3,
        sticky: false,
        trimStyle: 'plain',
        ...holes.length ? {holes} : {},
      })
    }
  }

  contains([x, y, z]: Vec3) {
    return y >= this.floorY - 1 && y <= this.floorY + this.height && this.floorAt(x, z) !== undefined
  }

  floorAt(x: number, z: number) {
    return this.floors.some(({center, size}) => Math.abs(x - center[0]) <= size[0] / 2 + 1e-6 && Math.abs(z - center[1]) <= size[1] / 2 + 1e-6) ? this.floorY : undefined
  }
}
