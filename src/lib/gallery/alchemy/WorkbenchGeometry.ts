import type {GrainMapping} from '../woodGrain.ts'
import type {BufferGeometry} from 'three/webgpu'

import {mulberry32} from 'math/random'
import {ExtrudeGeometry, Path, Shape} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, roundedBox} from '../lodgeInterior/place.ts'
import {withWoodGrain} from '../woodGrain.ts'
import {alchemySink, workbench} from './alchemyMachine.ts'

/** the grain of a piece built along x, along z or standing up along y, seen from its own middle */
const alongX: GrainMapping = (x, y, z) => [x, z + y * 0.3]
const alongZ: GrainMapping = (x, y, z) => [z, x + y * 0.3]
const alongY: GrainMapping = (x, y, z) => [y, x + z]
/** how far the top’s edges are eased */
const ease = 0.004

/** a box a collider takes up, in the bench’s frame: where its middle lies and how large it is */
export type WorkbenchCollider = {
  center: readonly [number, number, number]
  size: readonly [number, number, number]
}

/**
 * The workbench of the alchemy machine, see {@link workbench}: a top of one thick slab with eased edges and the round hole of the sink cut through its east end, over aprons round its sides and ends, on four square legs standing flush with the aprons’ faces.
 * Every piece has its own grain, see `GrainedWoodMaterial`. Its frame lines up with the world’s, its origin on the floor under the top’s middle; the `top` is a piece of its own, which its collider follows round the hole.
 */
export default class WorkbenchGeometry {
  readonly colliders: ReadonlyArray<WorkbenchCollider>
  readonly frame: BufferGeometry
  readonly top: BufferGeometry

  constructor() {
    const {apron: [apronDepth, apronThickness], depth, height, leg, length, overhang} = workbench
    const state = mulberry32.create(4391)
    let seed = 0
    /** a rounded box of the size with its grain, its middle at the point */
    const piece = (size: [number, number, number], mapping: GrainMapping, [x, y, z]: readonly [number, number, number]) => {
      const offset = mulberry32.sample(state) * 40
      const geometry = withWoodGrain(roundedBox(size, 0.004, 2), (px, py, pz) => {
        const [along, across] = mapping(px, py, pz)
        return [along + offset, across]
      }, seed++ * 0.618034 % 1)
      return place(geometry, x, y, z)
    }
    const [sinkX, , sinkZ] = alchemySink.center
    const [benchX, benchZ] = workbench.center
    // In the shape’s plane, x runs east and y north, so it turns flat onto the bench by its rotation about x.
    const outline = new Shape
    outline.moveTo(-length / 2, -depth / 2)
    outline.lineTo(length / 2, -depth / 2)
    outline.lineTo(length / 2, depth / 2)
    outline.lineTo(-length / 2, depth / 2)
    outline.closePath()
    const hole = new Path
    hole.absarc(sinkX - benchX, -(sinkZ - benchZ), alchemySink.radius + alchemySink.thickness, 0, Math.PI * 2, true)
    outline.holes.push(hole)
    const slab = new ExtrudeGeometry(outline, {
      depth: workbench.top - ease * 2,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: ease,
      bevelThickness: ease,
      bevelOffset: -ease,
      curveSegments: 72,
    })
    slab.rotateX(-Math.PI / 2).translate(0, height - workbench.top + ease, 0)
    this.top = withWoodGrain(slab, (x, y, z) => [x + 13, z + y * 0.3], 0.31)
    const underTop = height - workbench.top
    const apronY = underTop - apronDepth / 2
    const parts: Array<BufferGeometry> = []
    // The aprons along both sides and across both ends, their faces where the top’s overhang ends
    for (const side of [-1, 1]) {
      parts.push(
        piece([length - overhang * 2, apronDepth, apronThickness], alongX, [0, apronY, side * (depth / 2 - overhang - apronThickness / 2)]),
        piece([apronThickness, apronDepth, depth - overhang * 2 - apronThickness * 2], alongZ, [side * (length / 2 - overhang - apronThickness / 2), apronY, 0]),
      )
    }
    const legs = [-1, 1].flatMap(x => [-1, 1].map(z => [x * (length / 2 - overhang - leg / 2), z * (depth / 2 - overhang - leg / 2)] as const))
    for (const [x, z] of legs) {
      parts.push(piece([leg, underTop, leg], alongY, [x, underTop / 2, z]))
    }
    this.frame = mergeParts(parts)
    this.colliders
      = legs.map(([x, z]) => ({
        center: [x, underTop / 2, z] as const,
        size: [leg, underTop, leg] as const,
      }))
  }

  dispose() {
    this.frame.dispose()
    this.top.dispose()
  }
}
