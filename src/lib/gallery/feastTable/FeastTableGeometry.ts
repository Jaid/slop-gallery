import type {SectionPoint} from '../ExtrudedProfileGeometry.ts'
import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import ExtrudedProfileGeometry from '../ExtrudedProfileGeometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import feastTable, {feastTableFrame} from './layout.ts'
import {boardPith, GrainSeeds, withGrain} from './woodGrain.ts'

/** points along a circle around `center`, from the angle `start` to `end` in radians */
const arc = (center: SectionPoint, radius: number, start: number, end: number, segments: number): Array<SectionPoint> => Array.from({length: segments + 1}, (_, index) => {
  const angle = start + (end - start) * index / segments
  return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
})

/**
 * The turned leg of a refectory table, from the top of the turning down to the floor: a cup-and-cover bulb between ringed necks, a plain block where the stretcher enters and a bun foot. Radii are in meters.
 */
export const legTurning: ReadonlyArray<ProfilePoint> = [
  [0, 0.6],
  [0.044, 0.6],
  [0.044, 0.585],
  [0.036, 0.572],
  [0.04, 0.56],
  [0.05, 0.548],
  [0.05, 0.536],
  [0.038, 0.524],
  [0.044, 0.5],
  [0.062, 0.47],
  [0.074, 0.44],
  [0.078, 0.41],
  [0.077, 0.375],
  [0.071, 0.335],
  [0.06, 0.3],
  [0.047, 0.272],
  [0.036, 0.255],
  [0.046, 0.243],
  [0.046, 0.23],
  [0.034, 0.216],
  [0.034, 0.17],
  [0.045, 0.165],
  [0.045, 0.075],
  [0.034, 0.068],
  [0.044, 0.052],
  [0.052, 0.03],
  [0.05, 0.01],
  [0.044, 0],
  [0, 0],
]

/**
 * A long mahogany refectory table: four boards with a molded round-over and cove along both long edges, aprons on square leg blocks, six pairs of turned legs and low stretchers across every pair and down the middle.
 *
 * On the top lies a crimson damask runner, hanging over both ends, with gilt braid along its edges and a fringe of gilt cords at either end. The origin is on the floor under the middle of the top; the length runs along z. `wood` carries the `woodGrain` attribute.
 */
export default class FeastTableGeometry {
  readonly braid: BufferGeometry
  readonly runner: BufferGeometry
  readonly wood: BufferGeometry

  constructor() {
    const {apron, boards, height, leg, runner, stretcher, width} = feastTable
    const {halfLength, halfWidth, legX, underside} = feastTableFrame
    const seeds = new GrainSeeds
    const wood: Array<BufferGeometry> = []
    const timber = (geometry: BufferGeometry, fiber: 'x' | 'y' | 'z', center: Vector3, pith?: Vector3) => {
      const seed = seeds.next()
      wood.push(withGrain(geometry, fiber, pith ?? boardPith(center, fiber, seed), seed))
    }
    const box = (size: readonly [number, number, number], center: Vector3, fiber: 'x' | 'y' | 'z') => {
      const block = new BoxGeometry(...size)
      timber(block.translate(center.x, center.y, center.z), fiber, center)
    }
    // Boards run the full length. The outer ones carry the molding: a cove under a straight fillet and a round-over into the top.
    const boardWidth = width / boards
    const top = height
    const bottom = underside
    const cove = 0.022
    const roundOver = 0.016
    const edge = (side: number): Array<SectionPoint> => {
      const molding: Array<SectionPoint> = [
        // A concave cove under the edge, centered outside the board, ending in a narrow lip.
        ...arc([halfWidth, bottom], cove, Math.PI, Math.PI / 2, 6),
        [halfWidth, top - roundOver],
        ...arc([halfWidth - roundOver, top - roundOver], roundOver, 0, Math.PI / 2, 6).slice(1),
      ]
      return molding.map(([x, y]) => [side * x, y])
    }
    for (let index = 0; index < boards; index++) {
      const left = -halfWidth + index * boardWidth
      const right = left + boardWidth
      let section: Array<SectionPoint> = [[left, bottom], [right, bottom], [right, top], [left, top]]
      if (index === boards - 1) {
        section = [[left, bottom], ...edge(1), [left, top]]
      } else if (index === 0) {
        section = [[right, bottom], ...edge(-1), [right, top]]
      }
      const center = new Vector3((left + right) / 2, (top + bottom) / 2, 0)
      timber(new ExtrudedProfileGeometry(section, -halfLength, halfLength), 'z', center)
    }
    // Aprons stop 2 mm behind the leg blocks’ outer faces, so the two never share a plane.
    const apronFront = halfWidth - apron.inset - 0.002
    const endLegZ = leg.z.at(-1)!
    const endApronZ = endLegZ + leg.block / 2 - 0.002 - apron.thickness / 2
    for (const side of [-1, 1]) {
      box([apron.thickness, apron.height, endLegZ * 2], new Vector3(side * (apronFront - apron.thickness / 2), underside - apron.height / 2, 0), 'z')
      box([(legX - leg.block / 2) * 2, apron.height, apron.thickness], new Vector3(0, underside - apron.height / 2, side * endApronZ), 'x')
    }
    const turnedTop = legTurning[0][1]
    for (const z of leg.z) {
      for (const side of [-1, 1]) {
        const x = side * legX
        const block = new Vector3(x, (turnedTop + underside) / 2, z)
        box([leg.block, underside - turnedTop, leg.block], block, 'y')
        const turning = new RevolvedProfileGeometry(legTurning, {sides: 20})
        // The pith runs just beside the turning’s axis, so the rings show as bands that follow its swellings.
        timber(turning.translate(x, 0, z), 'y', new Vector3(x + 0.012, 0, z - 0.008))
      }
      // A stretcher across the pair enters both legs’ plain blocks.
      box([legX * 2, stretcher.height, stretcher.width], new Vector3(0, stretcher.y, z), 'x')
    }
    // The long stretcher is a hair slimmer than the cross stretchers, so their faces never coincide where they cross.
    box([stretcher.width * 0.85, stretcher.height - 0.01, endLegZ * 2], new Vector3(0, stretcher.y, 0), 'z')
    this.wood = mergeParts(wood)
    const runnerParts: Array<BufferGeometry> = []
    const braidParts: Array<BufferGeometry> = []
    const half = runner.width / 2
    const {braid, drop, thickness} = runner
    const runnerBox = (size: readonly [number, number, number], center: readonly [number, number, number], target: Array<BufferGeometry>) => {
      const part = new BoxGeometry(...size)
      target.push(part.translate(...center))
    }
    runnerBox([runner.width, thickness, halfLength * 2], [0, top + thickness / 2, 0], runnerParts)
    const braidTop = top + thickness + 0.0015
    for (const end of [-1, 1]) {
      const endZ = end * (halfLength + thickness / 2)
      runnerBox([runner.width, drop + thickness, thickness], [0, top + thickness - (drop + thickness) / 2, endZ], runnerParts)
      for (const side of [-1, 1]) {
        const x = side * (half - braid / 2 + 0.0005)
        // The braid runs down each edge of the overhang; along the top it stops where the overhang begins.
        runnerBox([braid + 0.001, braidTop - (top - drop), thickness + 0.0015], [x, (braidTop + top - drop) / 2, end * (halfLength + (thickness + 0.0015) / 2)], braidParts)
      }
      // A woven heading at the hem, with a fringe of cords below it.
      const hemZ = end * (halfLength + (thickness + 0.003) / 2 - 0.00075)
      runnerBox([runner.width + 0.004, 0.014, thickness + 0.0045], [0, top - drop + 0.004, hemZ], braidParts)
      const cords = Math.round(runner.width / 0.009)
      for (let cord = 0; cord < cords; cord++) {
        const x = -half + (cord + 0.5) * runner.width / cords
        const length = 0.042 + cord * 0.618034 % 1 * 0.008
        const part = new CylinderGeometry(0.0022, 0.0016, length, 5, 1)
        braidParts.push(part.translate(x, top - drop - 0.003 - length / 2, end * (halfLength + thickness / 2)))
      }
    }
    for (const side of [-1, 1]) {
      runnerBox([braid + 0.001, braidTop - top, halfLength * 2], [side * (half - braid / 2 + 0.0005), (braidTop + top) / 2, 0], braidParts)
    }
    this.runner = mergeParts(runnerParts)
    this.braid = mergeParts(braidParts)
  }

  dispose() {
    this.wood.dispose()
    this.runner.dispose()
    this.braid.dispose()
  }
}
