import type {SectionPoint} from '../ExtrudedProfileGeometry.ts'
import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {SeatKind} from './layout.ts'
import type {BufferGeometry} from 'three/webgpu'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {BoxGeometry, CylinderGeometry, SphereGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import ExtrudedProfileGeometry from '../ExtrudedProfileGeometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import {seatDimensions} from './layout.ts'
import {boardPith, GrainSeeds, withGrain} from './woodGrain.ts'

/** height of the seat rails’ top, under the cushion */
const railTop = 0.4
const railHeight = 0.07
const post = 0.042
const legInset = 0.03
/** a turned front leg from the seat rail down to the floor, matching the table’s legs in miniature */
const frontLegTurning = (top: number): Array<ProfilePoint> => [
  [0, top],
  [0.021, top],
  [0.021, top - 0.03],
  [0.017, top - 0.045],
  [0.021, top - 0.075],
  [0.027, top - 0.12],
  [0.026, top - 0.16],
  [0.019, top - 0.195],
  [0.015, 0.13],
  [0.021, 0.12],
  [0.021, 0.095],
  [0.014, 0.07],
  [0.016, 0.025],
  [0.021, 0.012],
  [0.019, 0],
  [0, 0],
]

/**
 * A high-backed mahogany dining chair, upholstered in velvet: turned front legs, square back posts with gilt finials, an arched crest rail over a padded back and a padded seat on rails, with stretchers low between the legs. The carver at the head of the table is wider and taller and has padded arms on turned supports.
 *
 * The origin is on the floor under the middle of the seat; the front faces +z. `wood` carries the `woodGrain` attribute.
 */
export default class FeastChairGeometry {
  readonly gold: BufferGeometry
  readonly upholstery: BufferGeometry
  readonly wood: BufferGeometry

  constructor(kind: SeatKind, seed = 0) {
    const {armHeight, backHeight, depth, seatHeight, width} = seatDimensions[kind]
    const seeds = new GrainSeeds(seed * 97)
    const wood: Array<BufferGeometry> = []
    const upholstery: Array<BufferGeometry> = []
    const gold: Array<BufferGeometry> = []
    const timber = (geometry: BufferGeometry, fiber: 'x' | 'y' | 'z', center: Vector3, pith?: Vector3) => {
      const grainSeed = seeds.next()
      wood.push(withGrain(geometry, fiber, pith ?? boardPith(center, fiber, grainSeed, 0.2), grainSeed))
    }
    const box = (size: readonly [number, number, number], center: Vector3, fiber: 'x' | 'y' | 'z') => {
      const block = new BoxGeometry(...size)
      timber(block.translate(center.x, center.y, center.z), fiber, center)
    }
    const legX = width / 2 - legInset
    const frontZ = depth / 2 - legInset
    const backZ = -frontZ
    const postTop = backHeight - 0.04
    // Front legs: a square block in the rails’ height over a turning.
    const turnedTop = railTop - railHeight
    for (const side of [-1, 1]) {
      const x = side * legX
      box([post, railHeight, post], new Vector3(x, railTop - railHeight / 2, frontZ), 'y')
      const turning = new RevolvedProfileGeometry(frontLegTurning(turnedTop), {sides: 16})
      timber(turning.translate(x, 0, frontZ), 'y', new Vector3(x + 0.006, 0, frontZ + 0.004))
      // Back posts rise straight from the floor to the finials.
      box([post, postTop, post], new Vector3(x, postTop / 2, backZ), 'y')
      const finial = new SphereGeometry(0.021, 16, 10)
      const collar = new CylinderGeometry(0.017, 0.019, 0.012, 16)
      gold.push(finial.translate(x, postTop + 0.019, backZ), collar.translate(x, postTop + 0.006, backZ))
      // Side rails and a low side stretcher, both between the front leg and the back post.
      box([0.024, railHeight - 0.004, frontZ - backZ - post], new Vector3(x - side * 0.006, railTop - railHeight / 2, 0), 'z')
      box([0.018, 0.026, frontZ - backZ - post], new Vector3(x, 0.11, 0), 'z')
    }
    // Front and back rails, and a middle stretcher between the side stretchers.
    box([legX * 2 - post, railHeight - 0.004, 0.024], new Vector3(0, railTop - railHeight / 2, frontZ - 0.006), 'x')
    box([legX * 2 - post, railHeight - 0.004, 0.024], new Vector3(0, railTop - railHeight / 2, backZ + 0.006), 'x')
    box([legX * 2 - 0.018, 0.022, 0.016], new Vector3(0, 0.11, 0), 'x')
    // Lower back rail and the arched crest rail between the posts.
    const innerWidth = legX * 2 - post
    const backBottom = seatHeight + 0.09
    box([innerWidth + 0.004, 0.04, 0.028], new Vector3(0, backBottom - 0.02, backZ), 'x')
    const crestBottom = backHeight - (kind === 'head' ? 0.18 : 0.15)
    const crestEnds = postTop - 0.03
    const crestPeak = backHeight - 0.015
    const crest: Array<SectionPoint> = [[-innerWidth / 2 - 0.002, crestBottom], [innerWidth / 2 + 0.002, crestBottom]]
    const crestSegments = 16
    for (let index = 0; index <= crestSegments; index++) {
      const t = 1 - index / crestSegments * 2
      // A shallow arch, flattening toward the posts.
      crest.push([t * (innerWidth / 2 + 0.002), crestEnds + (crestPeak - crestEnds) * Math.cos(t * Math.PI / 2) ** 1.4])
    }
    const crestRail = new ExtrudedProfileGeometry(crest, backZ - 0.016, backZ + 0.016)
    timber(crestRail, 'x', new Vector3(0, (crestBottom + crestPeak) / 2, backZ))
    // The seat cushion runs from the front rail to the back posts’ front faces; the back pad fills the frame between the posts.
    const cushionBack = backZ + post / 2
    const cushionFront = depth / 2 + 0.008
    const cushion = new RoundedBoxGeometry(width + 0.006, seatHeight - railTop + 0.006, cushionFront - cushionBack, 3, 0.022)
    upholstery.push(cushion.translate(0, (railTop - 0.006 + seatHeight) / 2, (cushionFront + cushionBack) / 2))
    // The pad stands proud of the posts behind and in front, so none of its faces lies in theirs.
    const pad = new RoundedBoxGeometry(innerWidth + 0.004, crestBottom - backBottom + 0.01, 0.046, 3, 0.016)
    upholstery.push(pad.translate(0, (crestBottom + backBottom) / 2, backZ + 0.006))
    if (armHeight !== undefined) {
      for (const side of [-1, 1]) {
        const x = side * legX
        const support: Array<ProfilePoint> = [
          [0, armHeight - 0.028],
          [0.017, armHeight - 0.028],
          [0.017, armHeight - 0.05],
          [0.012, armHeight - 0.07],
          [0.02, armHeight - 0.14],
          [0.021, armHeight - 0.17],
          [0.013, railTop + 0.04],
          [0.019, railTop + 0.015],
          [0.019, railTop],
          [0, railTop],
        ]
        const turning = new RevolvedProfileGeometry(support, {sides: 16})
        timber(turning.translate(x, 0, frontZ), 'y', new Vector3(x + 0.005, 0, frontZ))
        const armLength = frontZ - backZ + 0.06
        box([0.05, 0.028, armLength], new Vector3(x, armHeight - 0.014, (frontZ + 0.06 + backZ) / 2), 'z')
        const armPad = new RoundedBoxGeometry(0.044, 0.02, armLength - 0.16, 3, 0.008)
        upholstery.push(armPad.translate(x, armHeight + 0.006, (frontZ + 0.06 + backZ) / 2 + 0.01))
      }
    }
    this.wood = mergeParts(wood)
    this.upholstery = mergeParts(upholstery)
    this.gold = mergeParts(gold)
  }

  dispose() {
    this.wood.dispose()
    this.upholstery.dispose()
    this.gold.dispose()
  }
}
