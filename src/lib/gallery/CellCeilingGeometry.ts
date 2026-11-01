import type {RoundVestibule} from './roundVestibule.ts'

import {knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {BufferGeometry, CylinderGeometry, ExtrudeGeometry, Path, Shape, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {corniceBands} from './architectureDimensions.ts'
import rosette from './rosette.ts'

/** how thick the ceilings’ slabs are, centered on the ceiling height */
export const cellCeilingSlab = 0.18
/**
 * The hall’s coffered ceiling, in meters: a grid of walnut beams and a gilt fillet round the field of every coffer.
 * Both counts are odd, so a coffer lies in the middle of the hall, which a ceiling rose round the chandelier’s canopy adorns.
 */
export const cellCoffers = {
  /** how many coffers run across the hall along x and along z */
  count: [9, 7],
  beam: {
    width: 0.2,
    depth: 0.2,
    radius: 0.012,
  },
  /** how far a fillet lies in from the beams round its field, and its section, the bevel round it left out */
  fillet: {
    inset: 0.12,
    width: 0.03,
    depth: 0.008,
    bevel: 0.004,
  },
  /** the ceiling rose: a disk deep enough to close the gap over the canopy, which hangs a few centimeters under the ceiling, ringed by a rosette without a boss */
  rose: {
    size: 0.8,
    radius: 0.36,
    depth: 0.045,
  },
} as const
/** The round room’s ceiling: a gilt ring in from the wall, round the LED panel in its middle. */
export const cellRoundCeiling = {
  ring: {
    inset: 0.75,
    tube: 0.025,
  },
} as const
/** how far the hall’s walls’ cornice stands out of their center lines, which frames the coffers all round */
const corniceFront = Math.max(...corniceBands.map(band => band.front))
const roundSegments = 96

/** How high the origin of the LED panel in the middle of the vestibule’s ceiling hangs under a ceiling `height` high; like the Banquet’s, the top of its housing sits 5 mm into the slab, so no light leaks between them. */
export function cellLedY(height: number) {
  return height - cellCeilingSlab / 2 + 0.005 - knotLightHousingY - knotLightHousingSize[1] / 2
}

/**
 * The coffers along a side of the hall `length` long, `count` of them, every one as wide between the beams or the cornice round it: their clear width, their middles and the middles of the beams between them, relative to the hall’s middle.
 */
export function cofferLine(length: number, count: number) {
  const {width} = cellCoffers.beam
  const span = length - corniceFront * 2
  const field = (span - (count - 1) * width) / count
  return {
    field,
    middles: Array.from({length: count}, (_, index) => -span / 2 + field / 2 + index * (field + width)),
    beams: Array.from({length: count - 1}, (_, index) => -span / 2 + (index + 1) * field + (index + 0.5) * width),
  }
}

/** A gilt fillet framing a field `x` × `z` meters across its outside, hanging from the ceiling at y = 0 round the middle. */
function filletFrame(x: number, z: number) {
  const {bevel, depth, width} = cellCoffers.fillet
  /** The rectangle `x` × `z` round the middle, in a shape’s plane, inset by `inset`. */
  const outline = (path: Path, inset: number) => {
    const halfX = x / 2 - inset
    const halfZ = z / 2 - inset
    path.moveTo(-halfX, -halfZ)
    path.lineTo(halfX, -halfZ)
    path.lineTo(halfX, halfZ)
    path.lineTo(-halfX, halfZ)
    path.closePath()
  }
  const shape = new Shape
  outline(shape, bevel)
  const hole = new Path
  outline(hole, width - bevel)
  shape.holes.push(hole)
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
  })
  // The shape’s y runs along z, and the extrusion down from the ceiling, its back bevel hidden in the slab.
  return geometry.rotateX(Math.PI / 2)
}

/**
 * The Cell’s ceilings, relative to its origin, by material: the hall’s slab, whose underside forms the coffers’ fields, and the round room’s slab, the beams of the hall’s coffers and every bit of gilding on both.
 */
export default class CellCeilingGeometry {
  /** the beams running along x, from wall to wall */
  readonly beams: BufferGeometry
  /**
   * the beams running along z, between those along x and on into the walls, laid along local x: the mesh turns them a quarter about y, which carries local x to world −z and local z to world x, so a material whose grain follows local x follows them too
   */
  readonly crossBeams: BufferGeometry
  /** the coffers’ fillets, the ceiling rose and the round ceiling’s ring */
  readonly gilt: BufferGeometry
  readonly hall: BufferGeometry
  /** the round room’s slab, empty while a door closes the arch */
  readonly rounds: BufferGeometry

  constructor({height, size: [width, depth], vestibule}: {
    /** how high the ceilings hang over the floor, the middle of their slabs */
    height: number
    /** the hall’s floor plan, centered on the origin */
    size: readonly [width: number, depth: number]
    /** the round room beyond the hall’s north wall, if the arch opens there */
    vestibule?: Pick<RoundVestibule, 'center' | 'radius'>
  }) {
    const underside = height - cellCeilingSlab / 2
    const {beam, count: [countX, countZ], fillet, rose} = cellCoffers
    const alongX = cofferLine(width, countX)
    const alongZ = cofferLine(depth, countZ)
    const beamY = underside - beam.depth / 2
    /** A beam `length` meters long along x, hanging from the ceiling with its middle under `[x, z]`. */
    const beamPiece = (length: number, x: number, z: number) => {
      const piece = new RoundedBoxGeometry(length, beam.depth, beam.width, 1, beam.radius)
      return piece.translate(x, beamY, z)
    }
    const hall = new RoundedBoxGeometry(width, cellCeilingSlab, depth, 2, 0.045)
    this.hall = hall.translate(0, height, 0)
    this.beams = mergeParts(alongZ.beams.map(z => beamPiece(width, 0, z)))
    // Butting against the sides of the beams along x, and from the outermost ones on into the walls.
    const stops = [-depth / 2, ...alongZ.beams.flatMap(z => [z - beam.width / 2, z + beam.width / 2]), depth / 2]
    const pieces = Array.from({length: stops.length / 2}, (_, index) => [stops[index * 2], stops[index * 2 + 1]] as const)
    this.crossBeams = mergeParts(alongX.beams.flatMap(x => pieces.map(([from, to]) => beamPiece(to - from, -(from + to) / 2, x))))
    const frame = filletFrame(alongX.field - fillet.inset * 2, alongZ.field - fillet.inset * 2)
    const gilt: Array<BufferGeometry> = []
    for (const x of alongX.middles) {
      for (const z of alongZ.middles) {
        gilt.push(frame.clone().translate(x, underside, z))
      }
    }
    const disk = new CylinderGeometry(rose.radius, rose.radius, rose.depth, 48)
    gilt.push(disk.translate(0, underside - rose.depth / 2, 0), rosette(rose.size, {boss: false}).rotateX(Math.PI).translate(0, underside, 0))
    frame.dispose()
    if (vestibule) {
      const {center: [x, z], radius} = vestibule
      const ring = new TorusGeometry(radius - cellRoundCeiling.ring.inset, cellRoundCeiling.ring.tube, 8, roundSegments)
      gilt.push(ring.rotateX(Math.PI / 2).translate(x, underside, z))
      const slab = new CylinderGeometry(radius, radius, cellCeilingSlab, roundSegments)
      this.rounds = slab.translate(x, height, z)
    } else {
      this.rounds = new BufferGeometry
    }
    this.gilt = mergeParts(gilt)
  }

  dispose() {
    for (const geometry of [this.beams, this.crossBeams, this.gilt, this.hall, this.rounds]) {
      geometry.dispose()
    }
  }
}
