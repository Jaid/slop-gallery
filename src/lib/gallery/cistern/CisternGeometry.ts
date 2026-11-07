import type {Vec3} from '../types.ts'

import {BoxGeometry, BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import BarredOpeningGeometry from '../BarredOpeningGeometry.ts'
import {climbCulvert, climbDrain} from '../climb.ts'
import {cistern, cisternBackstop, cisternChannel, cisternFloorHeight, cisternWalls} from './cistern.ts'
import {cisternGrille} from './grille.ts'

type Section = ReadonlyArray<readonly [lateral: number, y: number]>

/** how many stations the channel’s visible stone and water are cut into along it, and its collider: coarsely, as a welded collider cut into triangles a few centimeters long holds an orb at rest in it until it falls asleep */
const stations = [320, 160] as const
/** how many pieces the channel’s round bottom is cut into, for the eye and for its collider, which an odd count leaves a level facet along its bottom, for an orb to roll along */
const bottomSegments = [12, 15] as const
/** how deep the water runs in the channel, over its bottom */
export const channelWaterDepth = 0.06
/** how far the pieces of the cistern’s floor reach round the turn’s center at most, and how many rings it is cut into inside and outside the channel */
const [floorSegments, innerRings, outerRings] = [96, 14, 6] as const
/** how thick the backstop’s iron plate is */
const plateThickness = 0.012
/** how long the water takes from the channel’s lip down into the drain, a little past the floor, through the grate */
const outfallBelow = 0.04
const gravity = 9.81
const {bore, length, turn} = cisternChannel
const lipAlong = length
/** how far along the channel, from its start to its lip, with the stations of its turn and its run out through the culvert */
const alongs = (count: number) => {
  const turnCount = Math.round(count * turn.end / length)
  return [
    ...Array.from({length: turnCount}, (_, index) => turn.end * index / turnCount),
    ...Array.from({length: 5}, (_, index) => turn.end + (length - turn.end) * index / 4),
  ]
}
/** Where a point of the channel’s section lies `along` meters down it, `lateral` meters to the right of its middle, at the height `y`. */
function place(along: number, lateral: number, y: number): Vec3 {
  const {point: [x, , z], direction: [dx, , dz]} = cisternChannel.at(along)
  const norm = Math.hypot(dx, dz)
  return [x - dz / norm * lateral, y, z + dx / norm * lateral]
}
/** The channel’s round bottom from its left side to its right, with its upright sides up to `top`. */
function groove(along: number, top: number, segments: number): Section {
  const middle = cisternChannel.bottom(along) + bore
  return [
    [-bore, top],
    ...Array.from({length: segments + 1}, (_, index): readonly [number, number] => {
      const angle = Math.PI * index / segments
      return [-bore * Math.cos(angle), middle - bore * Math.sin(angle)]
    }),
    [bore, top],
  ]
}
/** how high the channel’s sides stand `along` meters down it: up to the floor beside it, through the walls up to its rim */
const sideTop = (along: number) => (along <= turn.end ? cistern.apronEdge(along) : cisternChannel.rim(along))
/** Which way is right of the channel `along` meters down it, scaled by `side`. */
const rightOf = (along: number, side = 1) => {
  const [x, , z] = place(along, side, 0)
  const [mx, , mz] = place(along, 0, 0)
  return [x - mx, 0, z - mz] as Vec3
}
/** The grille’s bars and the stone that lines its opening through the cistern’s flat wall and the vestibule’s round wall back to back with it, out to where the round wall’s center line curves furthest away from the flat wall’s, at its jambs. */
export function cisternGrilleGeometry() {
  const wall = cisternWalls.find(value => value.id === 'bastion-cistern_flat')!
  return new BarredOpeningGeometry(wall, wall.holes!.find(value => value.name === 'vestibule')!, {
    bands: cisternGrille.bands,
    columns: cisternGrille.columns,
    depth: cisternGrille.gap,
  })
}
/**
 * A strip swept through the sections at the stations along the channel, facing the side `toward` points to from the section’s first point at its first station.
 * Smooth along the channel and across the section.
 */
function strip(along: ReadonlyArray<number>, section: (along: number) => Section, toward: Vec3) {
  const rows = along.map(value => section(value).map(([lateral, y]) => place(value, lateral, y)))
  const columns = rows[0].length
  const positions = rows.flat(2)
  const [a, b, c] = [rows[0][0], rows[0][1], rows[1][0]].map(point => new Vector3(...point))
  const normal = b.clone().sub(a).cross(c.clone().sub(a))
  const flip = normal.dot(new Vector3(...toward)) > 0
  const indices: Array<number> = []
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const first = row * columns + column
      const [right, below, diagonal] = [first + 1, first + columns, first + columns + 1]
      indices.push(...flip ? [first, right, below, right, diagonal, below] : [first, below, right, right, below, diagonal])
    }
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
/** A flat cap across the channel `along` meters down it, filling the outline, facing along the channel or back up it. */
function cap(along: number, outline: Section, forward: boolean) {
  const corners = outline.map(([lateral, y]) => place(along, lateral, y))
  const triangles = ShapeUtils.triangulateShape(outline.map(([lateral, y]) => new Vector2(lateral, y)), [])
  const {direction} = cisternChannel.at(along)
  const facing = new Vector3(...direction)
  facing.multiplyScalar(forward ? 1 : -1)
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(corners.flat(), 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(corners.flatMap(() => facing.toArray()), 3))
  const [first, u, v] = [new Vector3, new Vector3, new Vector3]
  geometry.setIndex(triangles.flatMap(([a, b, c]) => {
    first.fromArray(corners[a])
    u.fromArray(corners[b]).sub(first)
    v.fromArray(corners[c]).sub(first)
    return u.cross(v).dot(facing) > 0 ? [a, b, c] : [a, c, b]
  }))
  return geometry
}
/** The ring of the floor’s pieces at the distance from the turn’s center, round its half from the start of the channel to its end, each point at the floor’s height. */
function floorRing(out: number) {
  const [x, z] = turn.center
  return Array.from({length: floorSegments + 1}, (_, index): Vec3 => {
    const angle = Math.PI * index / floorSegments
    const [px, pz] = [x + Math.cos(angle) * out, z - Math.sin(angle) * out]
    return [px, cisternFloorHeight(px, pz), pz]
  })
}
/** The floor between the rings at the distances from the turn’s center, facing up; from the turn’s center itself, if the first distance is 0, fanning out from it. */
function floorBand(outs: ReadonlyArray<number>) {
  const fan = outs[0] === 0
  const rows = (fan ? outs.slice(1) : outs).map(floorRing)
  const [x, z] = turn.center
  const positions = [...rows.flat(2), ...fan ? [x, cisternFloorHeight(x, z), z] : []]
  const indices: Array<number> = []
  const columns = floorSegments + 1
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < floorSegments; column++) {
      const first = row * columns + column
      const [next, outer, diagonal] = [first + 1, first + columns, first + columns + 1]
      // Rings grow outward from the turn’s center, counter-clockwise seen from above.
      indices.push(first, outer, next, next, outer, diagonal)
    }
  }
  if (fan) {
    const middle = rows.length * columns
    for (let column = 0; column < floorSegments; column++) {
      indices.push(middle, column, column + 1)
    }
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
/** The floor’s edge along the face of the flat wall from `from` to `to` along x, down to the wall’s foot, facing out of the cistern, where the grille and the culvert open over and under the floor. */
function floorSkirt(from: number, to: number) {
  const z = turn.center[1]
  const steps = Math.ceil((to - from) / 0.1)
  const positions = Array.from({length: steps + 1}, (_, step) => {
    const x = from + (to - from) * step / steps
    return [x, 0, z, x, cisternFloorHeight(x, z), z]
  }).flat()
  const indices = Array.from({length: steps}, (_, step) => {
    const [bottom, top, nextBottom, nextTop] = [step * 2, step * 2 + 1, step * 2 + 2, step * 2 + 3]
    return [bottom, nextBottom, top, top, nextBottom, nextTop]
  }).flat()
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The cistern’s floor, sunk into which its channel winds, the water in the channel and its fall off the lip, and the backstop over the channel behind the grille, all in the world’s frame, see {@link cistern} and {@link cisternChannel}.
 * The floor collides as it shows, the channel’s groove through `channelCollision`, cut more finely; the backstop as its box.
 */
export default class CisternGeometry {
  /** the backstop’s stone block over the channel */
  readonly backstop: BufferGeometry
  /** the channel’s groove and, through the walls, the stone it runs out in, and its lip */
  readonly channel: BufferGeometry
  readonly channelCollision: BufferGeometry
  readonly floor: BufferGeometry
  /** the water falling off the channel’s lip into the drain, its UV v the water’s age in seconds, with the attributes the fountain’s falling water reads */
  readonly outfall: BufferGeometry
  /** the iron plate on the backstop’s face */
  readonly plate: BufferGeometry
  /** the water running along the channel, its UV v how far along it */
  readonly water: BufferGeometry

  constructor() {
    // Its groove faces in, which its left side does toward its right.
    const channelStrips = (count: number, segments: number) => {
      const turnAlongs = alongs(count).filter(along => along <= turn.end + 1e-9)
      const runAlongs = alongs(count).filter(along => along >= turn.end - 1e-9)
      return [
        strip(turnAlongs, along => groove(along, sideTop(along), segments), rightOf(0)),
        strip(runAlongs, along => groove(along, sideTop(along), segments), rightOf(turn.end)),
      ]
    }
    // Through the walls, the stone fills the culvert across, up to the channel’s rim, down to its sill.
    const half = climbCulvert.width / 2 - 0.005
    const runAlongs = alongs(stations[0]).filter(along => along >= turn.end - 1e-9)
    const masonry = (side: number) => [
      strip(runAlongs, along => (side > 0 ? [[bore, sideTop(along)], [half, sideTop(along)]] : [[-half, sideTop(along)], [-bore, sideTop(along)]]), [0, 1, 0]),
      strip(runAlongs, along => (side > 0 ? [[half, sideTop(along)], [half, climbCulvert.bottom]] : [[-half, climbCulvert.bottom], [-half, sideTop(along)]]), rightOf(turn.end, side)),
    ]
    /** The stone across the culvert `along` meters down the channel, round its groove. */
    const culvertOutline = (along: number): Section => [
      [-half, climbCulvert.bottom],
      [half, climbCulvert.bottom],
      [half, sideTop(along)],
      ...groove(along, sideTop(along), bottomSegments[0]).toReversed(),
      [-half, sideTop(along)],
    ]
    this.channel = mergeParts([
      ...channelStrips(stations[0], bottomSegments[0]),
      ...masonry(1),
      ...masonry(-1),
      // Where it enters the culvert, under the floor’s edge, and its lip
      cap(turn.end, culvertOutline(turn.end), false),
      cap(lipAlong, culvertOutline(lipAlong), true),
    ])
    this.channelCollision = mergeParts(channelStrips(stations[1], bottomSegments[1]))
    this.water = this.flowingWater()
    this.outfall = this.fallingWater()
    const [cx] = turn.center
    this.floor = mergeParts([
      floorBand(Array.from({length: innerRings + 1}, (_, ring) => cistern.innerEdge * ring / innerRings)),
      floorBand(Array.from({length: outerRings + 1}, (_, ring) => cistern.outerEdge + (cistern.radius - cistern.outerEdge) * ring / outerRings)),
      floorSkirt(cx - cistern.radius, cx - cistern.outerEdge),
      floorSkirt(cx - cistern.innerEdge, cx + cistern.innerEdge),
      floorSkirt(cx + cistern.outerEdge, cx + cistern.radius),
    ])
    const [depth, width, height] = cisternBackstop.size
    const [x, y, z] = cisternBackstop.face
    const block = new BoxGeometry(width, height, depth - plateThickness)
    this.backstop = block.translate(x, cisternBackstop.underside + height / 2, z - plateThickness - (depth - plateThickness) / 2)
    const plate = new BoxGeometry(width - 0.12, height - 0.08, plateThickness)
    this.plate = plate.translate(x, cisternBackstop.underside + height / 2, z - plateThickness / 2)
    // Its face stands square to the shot, at the height of the shot’s orb as it strikes it.
    if (Math.abs(y - cisternBackstop.impact[1]) > 1e-9) {
      throw new RangeError('The backstop’s face has to meet the shot’s orb.')
    }
  }

  dispose() {
    for (const geometry of [this.backstop, this.channel, this.channelCollision, this.floor, this.outfall, this.plate, this.water]) {
      geometry.dispose()
    }
  }

  /** The water falling off the channel’s lip as a sheet as wide as its surface there, thrown out just far enough to land in the middle of the drain, and on down through its grate. */
  private fallingWater() {
    const across = Math.sqrt(bore ** 2 - (bore - channelWaterDepth) ** 2)
    const [x, , z] = place(lipAlong, 0, 0)
    const start = cisternChannel.bottom(lipAlong) + channelWaterDepth
    const landing = Math.sqrt(2 * start / gravity)
    const end = Math.sqrt(2 * (start + outfallBelow) / gravity)
    const speed = (climbDrain.center[1] - z) / landing
    const [rows, columns] = [14, 6]
    const positions: Array<number> = []
    const uvs: Array<number> = []
    const falls: Array<number> = []
    const airs: Array<number> = []
    const lobes: Array<number> = []
    const arounds: Array<number> = []
    for (let row = 0; row <= rows; row++) {
      const age = end * row / rows
      const fall = age / end
      // A little wider as it falls, the water spreading
      const width = across * (1 + fall * 0.25)
      for (let column = 0; column <= columns; column++) {
        const lateral = -width + width * 2 * column / columns
        positions.push(x + lateral, start - gravity * age ** 2 / 2, z + speed * age)
        uvs.push(column / columns, age)
        falls.push(fall)
        airs.push(0.15 + fall * 0.45)
        lobes.push(0.5)
        arounds.push(lateral * 3, 0)
      }
    }
    const indices: Array<number> = []
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const first = row * (columns + 1) + column
        const [right, below, diagonal] = [first + 1, first + columns + 1, first + columns + 2]
        indices.push(first, right, below, right, diagonal, below)
      }
    }
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('waterFall', new Float32BufferAttribute(falls, 1))
    geometry.setAttribute('waterAir', new Float32BufferAttribute(airs, 1))
    geometry.setAttribute('waterLobe', new Float32BufferAttribute(lobes, 1))
    geometry.setAttribute('waterAround', new Float32BufferAttribute(arounds, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  /** The water’s surface in the channel, `channelWaterDepth` over its bottom, from its start to its lip, with its UV running across it and along it in meters. */
  private flowingWater() {
    const across = Math.sqrt(bore ** 2 - (bore - channelWaterDepth) ** 2)
    const along = alongs(stations[0])
    const columns = 4
    const positions: Array<number> = []
    const uvs: Array<number> = []
    for (const value of along) {
      const y = cisternChannel.bottom(value) + channelWaterDepth
      for (let column = 0; column <= columns; column++) {
        const lateral = -across + across * 2 * column / columns
        positions.push(...place(value, lateral, y))
        uvs.push(column / columns, value)
      }
    }
    const indices: Array<number> = []
    for (let row = 0; row < along.length - 1; row++) {
      for (let column = 0; column < columns; column++) {
        const first = row * (columns + 1) + column
        const [right, below, diagonal] = [first + 1, first + columns + 1, first + columns + 2]
        // Left to right across the flow and on down it, facing up
        indices.push(first, right, below, right, diagonal, below)
      }
    }
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }
}
