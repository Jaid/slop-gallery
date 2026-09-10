import type {StairFlight} from '../stairs/StairFlight.ts'
import type {Vec3} from '../types.ts'
import type {Passage, PassageCutout} from './Passage.ts'

import {Brush, Evaluator, SUBTRACTION} from 'three-bvh-csg'
import {BoxGeometry, BufferGeometry, ExtrudeGeometry, Matrix4, MeshBasicNodeMaterial, Shape, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {stairHeadroom} from '../stairs/StairFlight.ts'

export type TimberSpan = {
  end: Vec3
  entryProjection?: number
  from?: number
  height: number
  start: Vec3
  to?: number
  width: number
}

const entranceProjection = 0.03
export function timberProfile(radius: number, height: number, inset: number) {
  const r = radius - inset
  const h = height - inset
  return [
    new Vector2(-r, -0.25),
    new Vector2(-r, h - 1.45),
    new Vector2(-r * 0.78, h - 0.72),
    new Vector2(-r * 0.36, h - 0.18),
    new Vector2(-r * 0.2, h),
    new Vector2(r * 0.2, h),
    new Vector2(r * 0.36, h - 0.18),
    new Vector2(r * 0.78, h - 0.72),
    new Vector2(r, h - 1.45),
    new Vector2(r, -0.25),
  ]
}
function timberRing(inside: Array<Vector2>, outside: Array<Vector2>, depth: number, distance: number, transform: Matrix4) {
  const parts: Array<BufferGeometry> = []
  for (let i = 1; i < inside.length; i++) {
    const a = inside[i - 1]!
    const b = inside[i]!
    const shape = new Shape([a, b, outside[i]!, outside[i - 1]!])
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    })
    // Grain follows each individual post/rafter, not a world-space axis.
    const tangent = b.clone().sub(a).normalize()
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < position.count; vertex++) {
      const x = position.getX(vertex) - a.x
      const y = position.getY(vertex) - a.y
      uv.setXY(vertex, (x * tangent.y - y * tangent.x + position.getZ(vertex)) * 0.7, (x * tangent.x + y * tangent.y) * 0.7)
    }
    parts.push(geometry.translate(0, 0, distance).applyMatrix4(transform))
  }
  return parts
}
/** Cut both the lining and projecting ribs, sharing the resulting surface with collision. */
function cutTimber(geometry: BufferGeometry, cutouts: ReadonlyArray<PassageCutout>) {
  if (!cutouts.length || !geometry.hasAttribute('position')) {
    return geometry
  }
  const evaluator = new Evaluator
  evaluator.useGroups = false
  const material = new MeshBasicNodeMaterial
  const brushes: Array<Brush> = []
  const brush = (part: BufferGeometry) => {
    const result = new Brush(part, material)
    result.updateMatrixWorld(true)
    brushes.push(result)
    return result
  }
  let retained: BufferGeometry | undefined
  try {
    let result = brush(geometry)
    for (const {position, size} of cutouts) {
      const cutter = brush(new BoxGeometry(...size).translate(...position))
      result = evaluator.evaluate(result, cutter, SUBTRACTION, brush(new BufferGeometry))
    }
    retained = result.geometry
    retained.computeBoundingBox()
    retained.computeBoundingSphere()
    return retained
  } finally {
    for (const item of brushes) {
      item.disposeCacheData()
      if (item.geometry !== retained) {
        item.geometry.dispose()
      }
    }
    material.dispose()
  }
}

/** Faceted timber portals with mitered knees, a flat crown and continuous plank backing. */
export class TimberGeometry {
  static passage(passage: Passage, ribCutouts: ReadonlyArray<PassageCutout> = []) {
    return new TimberGeometry(passage.spans.map(({start, end}, i) => ({
      start: [start[0], passage.floorY, start[1]],
      end: [end[0], passage.floorY, end[1]],
      width: passage.width,
      height: passage.height,
      entryProjection: i === 0 ? entranceProjection : 0,
      // Keep the entire elbow open; the passage's timber ceiling closes these junctions.
      from: i > 0 ? passage.width / 2 : 0,
      to: Math.hypot(end[0] - start[0], end[1] - start[1]) - (i < passage.spans.length - 1 ? passage.width / 2 : 0),
    })), passage.cutouts, ribCutouts)
  }
  static stairs(stairs: StairFlight) {
    return new TimberGeometry([
      {
        start: stairs.start,
        end: stairs.end,
        width: stairs.width,
        height: stairHeadroom,
        entryProjection: entranceProjection,
      },
    ])
  }

  readonly ribs: BufferGeometry

  readonly shell: BufferGeometry

  constructor(spans: ReadonlyArray<TimberSpan>, cutouts: ReadonlyArray<PassageCutout> = [], ribCutouts: ReadonlyArray<PassageCutout> = []) {
    if ([...cutouts, ...ribCutouts].some(cutout => ![...cutout.position, ...cutout.size].every(Number.isFinite) || cutout.size.some(size => size <= 0))) {
      throw new RangeError('Timber cutouts need finite centers and positive dimensions.')
    }
    const sections = spans.map(({start, end, width, height, entryProjection = 0, from = 0, to = Math.hypot(end[0] - start[0], end[2] - start[2])}) => {
      const dx = end[0] - start[0]
      const dz = end[2] - start[2]
      const length = Math.hypot(dx, dz)
      if (![...start, ...end, width, height, entryProjection, from, to].every(Number.isFinite) || length <= 0 || width <= 0.5 || height <= 2 || entryProjection < 0 || from < 0 || to > length) {
        throw new RangeError('Timber spans need finite endpoints, positive clearance, nonnegative entry projection and trims inside the run.')
      }
      return {
        start,
        end,
        width,
        height,
        entryProjection,
        from,
        to,
        dx,
        dz,
        length,
      }
    })
    const shells: Array<BufferGeometry> = []
    const ribs: Array<BufferGeometry> = []
    for (const {start, end, width, height, entryProjection, from, to, dx, dz, length} of sections) {
      if (to <= from) {
        continue
      }
      const radius = width / 2 - 0.09
      const transform = (new Matrix4).makeRotationY(Math.atan2(dx, dz))
        .multiply((new Matrix4).set(1, 0, 0, 0, 0, 1, (end[1] - start[1]) / length, 0, 0, 0, 1, 0, 0, 0, 0, 1))
      transform.setPosition(...start)
      const backing = timberProfile(radius, height, 0)
      const outside = timberProfile(radius, height, -0.18)
      const ribInside = timberProfile(radius, height, 0.16)
      // Room entrances project past the structural wall ends like a fitted timber reveal.
      // At internal junctions the ends still butt together without overlapping lengths.
      const front = from - entryProjection
      shells.push(...timberRing(backing, outside, to - front, front, transform))
      const count = Math.max(1, Math.ceil((to - front) / 1.3))
      const depth = Math.min(0.19, (to - front) / 3)
      for (let rib = 0; rib <= count; rib++) {
        // Meet the lining exactly; penetrating it creates coincident exposed end caps.
        ribs.push(...timberRing(ribInside, backing, depth, front + (to - front - depth) * rib / count, transform))
      }
    }
    this.shell = cutTimber(shells.length ? mergeParts(shells) : new BufferGeometry, cutouts)
    try {
      this.ribs = cutTimber(ribs.length ? mergeParts(ribs) : new BufferGeometry, [...cutouts, ...ribCutouts])
    } catch (error) {
      this.shell.dispose()
      throw error
    }
  }

  dispose() {
    this.shell.dispose()
    this.ribs.dispose()
  }
}
