import type {RoundVestibule} from './roundVestibule.ts'
import type {Vec3} from './types.ts'

import {knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {BufferGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Path, PlaneGeometry, Shape, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {corniceBands, wallFace} from './architectureDimensions.ts'

/** where a slope of the hall’s ceiling lies, in the Cell’s frame: the middle of its underside and the turn that carries its own frame there */
export type CellSlope = {
  position: Vec3
  rotation: Euler
}

/** how thick the ceilings’ slabs are, centered on the ceiling height */
export const cellCeilingSlab = 0.18
/**
 * The hall’s coffered ceiling, in meters: a grid of walnut beams up both slopes of its gable and a gilt fillet round the field of every coffer.
 */
export const cellCoffers = {
  /** how many coffers run across the hall along x, and up each slope from the eave to the ridge */
  count: [9, 4],
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
} as const
/**
 * The roof lights glazing every coffer up both slopes but the ring along the gables, the eave and the ridge: each opening reaches through the slab just inside its coffer’s gilt fillet and is glazed near the slab’s top, in panes between walnut glazing bars.
 */
export const cellSkylights = {
  /** how far an opening lies in from the beams round its coffer, just inside the fillet, which frames it in gilt */
  inset: cellCoffers.fillet.inset + cellCoffers.fillet.width + 0.005,
  /** how many panes each light has across the hall and down the slope */
  panes: [3, 3],
  /** the walnut sash: the frame round the opening and the bars between its panes, how deep both are, how far under the slab’s top they end and how round their edges are */
  sash: {
    frame: 0.05,
    bar: 0.03,
    depth: 0.06,
    top: 0.02,
    radius: 0.004,
  },
} as const
/** the walnut ridge beam along the hall’s apex, where both slopes meet, which the chandelier hangs from on a brass rod */
export const cellRidge = {
  width: 0.3,
  /** deep enough to take in the rafters’ ends where both slopes meet */
  depth: 0.36,
  radius: 0.015,
  /** the brass plate under the beam, which the ball at the top of the chandelier’s rod tucks into */
  plate: {
    radius: 0.075,
    depth: 0.03,
  },
} as const
/** The round room’s ceiling: a gilt ring in from the wall, round the LED panel in its middle. */
export const cellRoundCeiling = {
  ring: {
    inset: 0.75,
    tube: 0.025,
  },
} as const
/** how far the hall’s walls’ cornice stands out of their center lines, which the coffers start beyond at the eaves */
const corniceFront = Math.max(...corniceBands.map(band => band.front))
const roundSegments = 96

/** How high the origin of the LED panel in the middle of the vestibule’s ceiling hangs under a ceiling `height` high; like the Banquet’s, the top of its housing sits 5 mm into the slab, so no light leaks between them. */
export function cellLedY(height: number) {
  return height - cellCeilingSlab / 2 + 0.005 - knotLightHousingY - knotLightHousingSize[1] / 2
}

/** Where the chandelier hanging from the ridge of a hall whose ridge rises `ridgeHeight` swings about, in the Cell’s frame: the middle of the ball at its rod’s top, right under the plate under the ridge beam. */
export function cellChandelierPivot(ridgeHeight: number) {
  return ridgeHeight - cellCeilingSlab / 2 - cellRidge.depth - cellRidge.plate.depth
}

/** Whether the coffer `column` coffers from a slope’s west end and `row` down from its ridge is glazed: every one but those along the gables, the eave and the ridge. */
export function isCellSkylight(column: number, row: number) {
  const [columns, rows] = cellCoffers.count
  return column > 0 && column < columns - 1 && row > 0 && row < rows - 1
}

/**
 * The coffers along a line `length` meters long round its middle, `count` of them, every one as wide between beams `width` wide, starting `margins` meters in from either end: their clear width, their middles and the middles of the beams between them.
 */
export function cofferLine(length: number, count: number, [start, end]: readonly [number, number], width: number = cellCoffers.beam.width) {
  const from = -length / 2 + start
  const span = length - start - end
  const field = (span - (count - 1) * width) / count
  return {
    field,
    middles: Array.from({length: count}, (_, index) => from + field / 2 + index * (field + width)),
    beams: Array.from({length: count - 1}, (_, index) => from + (index + 1) * field + (index + 0.5) * width),
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
 * The Cell’s ceilings, relative to its origin, by material: the hall’s gabled ceiling rising from its north and south walls to a ridge along its middle like a house’s roof, coffered in walnut with gilt fillets up both slopes and glazed in all but the outer coffers, its gables papered like the walls under them, and the round room’s level slab with its gilt ring.
 *
 * Both slopes share one set of geometries in a slope’s own frame, which {@link slopes} place: x along the hall, z down the slope from the ridge to the eave, y out of the underside, which lies at y = 0.
 */
export default class CellCeilingGeometry {
  /** the purlins running along x, from gable to gable, between the coffers up a slope */
  readonly beams: BufferGeometry
  /**
   * the rafters running down a slope, between the purlins, and one against each gable, laid along local x: the mesh turns them a quarter about y, which carries local x to the slope’s −z and local z to its x, so a material whose grain follows local x follows them too
   */
  readonly crossBeams: BufferGeometry
  /** the triangles of the east and west walls between the top of the walls and the slopes, in the Cell’s frame */
  readonly gables: BufferGeometry
  /** the coffers’ fillets up a slope */
  readonly gilt: BufferGeometry
  /** the panes of the roof lights up a slope, facing down into the hall */
  readonly glass: BufferGeometry
  /** how long a slope runs along its underside, from the wall’s center line at the eave to the ridge */
  readonly length: number
  /** the brass plate under the ridge beam, which the chandelier hangs from, in the Cell’s frame */
  readonly plate: BufferGeometry
  /** the ridge beam, in the Cell’s frame */
  readonly ridge: BufferGeometry
  /** the round room’s gilt ring, in the Cell’s frame, empty while a door closes the arch */
  readonly roundGilt: BufferGeometry
  /** the round room’s slab, in the Cell’s frame, empty while a door closes the arch */
  readonly rounds: BufferGeometry
  /** the roof lights’ sash bars running along x up a slope: the rails of their frames and the glazing bars between their stiles */
  readonly sash: BufferGeometry
  /** the roof lights’ sash bars running down a slope, laid along local x and turned like {@link crossBeams}: the stiles of their frames and the glazing bars between the rails */
  readonly sashStiles: BufferGeometry
  /** the middles of the roof lights’ openings up a slope, across the hall and down the slope from its middle */
  readonly skylights: ReadonlyArray<readonly [x: number, z: number]>
  /** a slope’s slab, its underside at y = 0, pierced by the roof lights */
  readonly slab: BufferGeometry
  /** the south and the north slope */
  readonly slopes: readonly [CellSlope, CellSlope]

  constructor({height, roofPitch, size: [width, depth], vestibule}: {
    /** how high the ceilings hang over the floor at the walls, the middle of their slabs */
    height: number
    /** how steeply the hall’s ceiling rises from the north and south walls to its ridge, in radians */
    roofPitch: number
    /** the hall’s floor plan, centered on the origin */
    size: readonly [width: number, depth: number]
    /** the round room beyond the hall’s north wall, if the arch opens there */
    vestibule?: Pick<RoundVestibule, 'center' | 'radius'>
  }) {
    const underside = height - cellCeilingSlab / 2
    const rise = depth / 2 * Math.tan(roofPitch)
    const apex = underside + rise
    const {beam, count: [countX, countSlope], fillet} = cellCoffers
    this.length = depth / 2 / Math.cos(roofPitch)
    const half = this.length / 2
    // Up a slope from the cornice at the eave to the ridge beam, and across from the rafter against one gable to the one against the other.
    const alongX = cofferLine(width, countX, [wallFace + beam.width, wallFace + beam.width])
    const alongSlope = cofferLine(this.length, countSlope, [cellRidge.width / 2 / Math.cos(roofPitch), corniceFront / Math.cos(roofPitch)])
    /** A beam `length` meters long along x, hanging from the underside with its middle under `[x, z]`. */
    const beamPiece = (length: number, x: number, z: number) => {
      const piece = new RoundedBoxGeometry(length, beam.depth, beam.width, 1, beam.radius)
      return piece.translate(x, -beam.depth / 2, z)
    }
    this.skylights = alongX.middles.flatMap((x, column) => alongSlope.middles.flatMap((z, row) => (isCellSkylight(column, row) ? [[x, z] as const] : [])))
    const {inset, panes, sash} = cellSkylights
    const opening = [alongX.field - inset * 2, alongSlope.field - inset * 2] as const
    // The slab’s outline with an opening for every roof light; the shape’s y runs along z and its extrusion down from the slab’s top.
    const outline = new Shape
    outline.moveTo(-width / 2, -half)
    outline.lineTo(width / 2, -half)
    outline.lineTo(width / 2, half)
    outline.lineTo(-width / 2, half)
    outline.closePath()
    for (const [x, z] of this.skylights) {
      const hole = new Path
      hole.moveTo(x - opening[0] / 2, z - opening[1] / 2)
      hole.lineTo(x - opening[0] / 2, z + opening[1] / 2)
      hole.lineTo(x + opening[0] / 2, z + opening[1] / 2)
      hole.lineTo(x + opening[0] / 2, z - opening[1] / 2)
      hole.closePath()
      outline.holes.push(hole)
    }
    const slab = new ExtrudeGeometry(outline, {
      depth: cellCeilingSlab,
      bevelEnabled: false,
    })
    this.slab = slab.rotateX(Math.PI / 2).translate(0, cellCeilingSlab, 0)
    // The sash fills each opening, its top a little under the slab’s, its rails and the bars along x running between its stiles, and the bars down the slope butting against those along x.
    const sashY = cellCeilingSlab - sash.top - sash.depth / 2
    const panesX = cofferLine(opening[0], panes[0], [sash.frame, sash.frame], sash.bar)
    const panesZ = cofferLine(opening[1], panes[1], [sash.frame, sash.frame], sash.bar)
    /** A bar `length` meters long and `size` wide along x, with its middle at `[x, z]`. */
    const bar = (length: number, size: number, x: number, z: number) => {
      const piece = new RoundedBoxGeometry(length, sash.depth, size, 1, sash.radius)
      return piece.translate(x, sashY, z)
    }
    const rails = [[-(opening[1] - sash.frame) / 2, sash.frame, opening[0]], [(opening[1] - sash.frame) / 2, sash.frame, opening[0]], ...panesZ.beams.map(z => [z, sash.bar, opening[0] - sash.frame * 2])] as const
    const stiles = [[-(opening[0] - sash.frame) / 2, sash.frame], [(opening[0] - sash.frame) / 2, sash.frame], ...panesX.beams.map(x => [x, sash.bar])] as const
    const railStops = [-opening[1] / 2 + sash.frame, ...panesZ.beams.flatMap(z => [z - sash.bar / 2, z + sash.bar / 2]), opening[1] / 2 - sash.frame]
    const between = Array.from({length: railStops.length / 2}, (_, index) => [railStops[index * 2], railStops[index * 2 + 1]] as const)
    this.sash = mergeParts(this.skylights.flatMap(([x, z]) => rails.map(([along, size, length]) => bar(length, size, x, z + along))))
    // The frame’s stiles run whole between its rails, the glazing bars from one bar along x to the next.
    this.sashStiles = mergeParts(this.skylights.flatMap(([x, z]) => stiles.flatMap(([across, size], index) => {
      const spans = index < 2 ? [[railStops[0], railStops.at(-1)!] as const] : between
      return spans.map(([from, to]) => bar(to - from, size, -(z + (from + to) / 2), x + across))
    })))
    const glassY = sashY
    this.glass = mergeParts(this.skylights.map(([x, z]) => {
      const pane = new PlaneGeometry(...opening)
      return pane.rotateX(Math.PI / 2).translate(x, glassY, z)
    }))
    this.beams = mergeParts(alongSlope.beams.map(z => beamPiece(width, 0, z)))
    // Butting against the sides of the purlins, from the ridge beam down to the wall at the eave.
    const stops = [-half, ...alongSlope.beams.flatMap(z => [z - beam.width / 2, z + beam.width / 2]), half]
    const pieces = Array.from({length: stops.length / 2}, (_, index) => [stops[index * 2], stops[index * 2 + 1]] as const)
    const rafters = [-(width / 2 - wallFace - beam.width / 2), ...alongX.beams, width / 2 - wallFace - beam.width / 2]
    this.crossBeams = mergeParts(rafters.flatMap(x => pieces.map(([from, to]) => beamPiece(to - from, -(from + to) / 2, x))))
    const frame = filletFrame(alongX.field - fillet.inset * 2, alongSlope.field - fillet.inset * 2)
    this.gilt = mergeParts(alongX.middles.flatMap(x => alongSlope.middles.map(z => frame.clone().translate(x, 0, z))))
    frame.dispose()
    const middle: Vec3 = [0, underside + rise / 2, depth / 4]
    this.slopes = [
      {
        position: middle,
        rotation: new Euler(roofPitch, 0, 0),
      },
      // Turned round, so its eave lies to the north.
      {
        position: [0, middle[1], -middle[2]],
        rotation: new Euler(roofPitch, Math.PI, 0, 'YXZ'),
      },
    ]
    // Along the apex, its top where both undersides meet, its upper edges hidden in the slabs.
    const ridge = new RoundedBoxGeometry(width, cellRidge.depth, cellRidge.width, 2, cellRidge.radius)
    this.ridge = ridge.translate(0, apex - cellRidge.depth / 2, 0)
    // Its top 2 mm into the beam.
    const plate = new CylinderGeometry(cellRidge.plate.radius, cellRidge.plate.radius, cellRidge.plate.depth + 0.002, 32)
    this.plate = plate.translate(0, cellChandelierPivot(apex + cellCeilingSlab / 2) + (cellRidge.plate.depth + 0.002) / 2, 0)
    // From the top of the wall under it, as thick as the wall’s face, up to just under the slabs’ top, so the slabs cover its sloping edges.
    const gable = new Shape
    gable.moveTo(-depth / 2, height)
    gable.lineTo(depth / 2, height)
    gable.lineTo(0, height + rise)
    gable.closePath()
    this.gables = mergeParts([-1, 1].map(side => {
      const triangle = new ExtrudeGeometry(gable, {
        depth: wallFace,
        bevelEnabled: false,
      })
      // The shape’s x runs along z and its extrusion out of the room, toward the wall’s center line.
      return triangle.rotateY(side * Math.PI / 2).translate(side * (width / 2 - wallFace), 0, 0)
    }))
    if (vestibule) {
      const {center: [x, z], radius} = vestibule
      const ring = new TorusGeometry(radius - cellRoundCeiling.ring.inset, cellRoundCeiling.ring.tube, 8, roundSegments)
      this.roundGilt = ring.rotateX(Math.PI / 2).translate(x, underside, z)
      const round = new CylinderGeometry(radius, radius, cellCeilingSlab, roundSegments)
      this.rounds = round.translate(x, height, z)
    } else {
      this.roundGilt = new BufferGeometry
      this.rounds = new BufferGeometry
    }
  }

  dispose() {
    for (const geometry of [this.beams, this.crossBeams, this.gables, this.gilt, this.glass, this.plate, this.ridge, this.roundGilt, this.rounds, this.sash, this.sashStiles, this.slab]) {
      geometry.dispose()
    }
  }
}
