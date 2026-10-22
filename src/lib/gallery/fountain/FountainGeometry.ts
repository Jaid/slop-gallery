import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {WaterSheet} from './config.ts'

import {BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import ShapedLatheGeometry from '../ShapedLatheGeometry.ts'
import fountain, {arcPoint, arcVelocity, basinRadius, jetAngle, ribbonSheet, sheetFlightTime, sheetLanding, sheetPoint, spoutAngle, spoutOpening} from './config.ts'

const {basin, step, plinth, tazza, cup, pools, veil, ribbon, arc, jet, gravity} = fountain
const wall = basin.radius
/** Every profile runs from the axis outward, or from the top down, with the stone on its right; see RevolvedProfileGeometry. */
const profiles = {
  /** a round step with a rounded nosing */
  step: [
    [0, step.height],
    [step.radius - 0.04, step.height],
    [step.radius - 0.012, step.height - 0.008],
    [step.radius, step.height - 0.03],
    [step.radius, 0],
  ],
  /** floor, inner wall, a broad coping with a roll molding, a plain outer face and an ogee foot, all following the lobed plan */
  basin: [
    [0, basin.floor],
    [wall, basin.floor],
    [wall, basin.rimTop - 0.03],
    [wall + 0.012, basin.rimTop - 0.006],
    [wall + 0.03, basin.rimTop],
    [wall + 0.2, basin.rimTop],
    [wall + 0.232, basin.rimTop - 0.007],
    [wall + 0.254, basin.rimTop - 0.026],
    [wall + 0.262, basin.rimTop - 0.05],
    [wall + 0.254, basin.rimTop - 0.074],
    [wall + 0.232, basin.rimTop - 0.093],
    [wall + 0.212, basin.rimTop - 0.1],
    [wall + 0.2, basin.rimTop - 0.115],
    [wall + 0.2, 0.3],
    [wall + 0.214, 0.272],
    [wall + 0.252, 0.252],
    [wall + 0.286, 0.226],
    [wall + basin.foot, 0.19],
    [wall + basin.foot, step.height - 0.01],
  ],
  /** an octagonal plinth under water, with a projecting cap above it */
  plinth: [
    [0, plinth.top],
    [plinth.apothem + 0.05, plinth.top],
    [plinth.apothem + 0.05, plinth.top - 0.045],
    [plinth.apothem, plinth.top - 0.075],
    [plinth.apothem, 0.24],
    [plinth.apothem + 0.06, 0.2],
    [plinth.apothem + 0.06, basin.floor - 0.01],
  ],
  /** a vase-shaped baluster from inside the tazza down to the plinth */
  baluster: [
    [0.15, 1.45],
    [0.15, 1.33],
    [0.165, 1.305],
    [0.165, 1.275],
    [0.118, 1.25],
    [0.122, 1.18],
    [0.15, 1.11],
    [0.2, 1.03],
    [0.232, 0.96],
    [0.226, 0.91],
    [0.19, 0.885],
    [0.24, 0.87],
    [0.262, 0.85],
    [0.262, plinth.top - 0.01],
  ],
  /** inside floor, lip with its spouts, roll and the gadrooned underside */
  tazza: [
    [0, 1.48],
    [0.45, 1.5],
    [0.8, 1.54],
    [0.96, 1.575],
    [tazza.innerRadius, 1.602],
    [tazza.innerRadius + 0.016, tazza.lipTop],
    [tazza.radius - 0.022, tazza.lipTop],
    [tazza.radius - 0.004, tazza.lipTop - 0.012],
    [tazza.radius, 1.59],
    [tazza.radius - 0.008, 1.566],
    [tazza.radius - 0.03, 1.552],
    [0.98, 1.528],
    [0.84, 1.488],
    [0.62, 1.425],
    [0.42, 1.375],
    [0.26, 1.345],
    [0.14, 1.335],
  ],
  /** a slender stem from inside the cup down into the tazza */
  stem: [
    [0.055, 2.26],
    [0.055, 2.205],
    [0.085, 2.185],
    [0.085, 2.16],
    [0.062, 2.14],
    [0.066, 1.95],
    [0.088, 1.8],
    [0.12, 1.66],
    [0.15, 1.57],
    [0.17, 1.51],
    [0.17, 1.47],
  ],
  cup: [
    [0, 2.31],
    [0.25, 2.33],
    [0.4, 2.365],
    [cup.innerRadius, 2.39],
    [cup.innerRadius + 0.012, cup.lipTop],
    [cup.radius - 0.004, cup.lipTop],
    [cup.radius + 0.008, cup.lipTop - 0.012],
    [cup.radius + 0.008, cup.lipTop - 0.03],
    [cup.radius - 0.012, cup.lipTop - 0.046],
    [0.42, 2.322],
    [0.3, 2.268],
    [0.18, 2.228],
    [0.08, 2.212],
    [0.04, 2.21],
  ],
  /** a gilt bud in the cup that the crown jet rises from */
  finial: [
    [0, jet.y + 0.003],
    [jet.radius + 0.004, jet.y],
    [0.022, jet.y - 0.012],
    [0.036, jet.y - 0.04],
    [0.05, jet.y - 0.08],
    [0.054, jet.y - 0.115],
    [0.044, jet.y - 0.14],
    [0.03, jet.y - 0.152],
    [0.03, jet.y - 0.165],
    [0.048, jet.y - 0.18],
    [0.06, jet.y - 0.2],
    [0.062, 2.33],
    [0.07, 2.32],
    [0.07, 2.3],
  ],
  /** a gilt nozzle on the coping, along +y with its mouth at the origin */
  nozzle: [
    [0, -0.004],
    [fountain.arcRadius + 0.004, 0],
    [0.02, -0.008],
    [0.024, -0.024],
    [0.02, -0.042],
    [0.026, -0.056],
    [0.036, -0.07],
    [0.042, -0.09],
    [0.042, -0.12],
  ],
} satisfies Record<string, Array<ProfilePoint>>
/** the stone’s polygon count around the axis; the lobed and gadrooned pieces need finer steps */
export const fountainSegments = {
  step: 72,
  basin: 128,
  baluster: 48,
  tazza: 144,
  stem: 32,
  cup: 96,
  finial: 24,
  nozzle: 12,
} as const
/** smooth 0–1 profile of `count` rounded gadroons around the axis, 1 on their crests */
const gadroon = (angle: number, count: number) => Math.abs(Math.cos(angle * count / 2)) ** 0.6
/** the lobed plan of the basin: every point but the one on the axis follows the inner wall’s distance at its angle */
const lobed = (point: ProfilePoint, angle: number): ProfilePoint => [point[0] === 0 ? 0 : point[0] + basinRadius(angle) - wall, point[1]]
/** Gadroons swell from the underside of a bowl between `from` and `to` (distances from the axis), strongest midway. */
const gadrooned = (point: ProfilePoint, angle: number, count: number, depth: number, from: number, to: number): ProfilePoint => {
  const t = (point[0] - from) / (to - from)
  if (t <= 0 || t >= 1) {
    return point
  }
  return [point[0], point[1] - depth * Math.sin(Math.PI * t) ** 0.7 * gadroon(angle, count)]
}
/** the tazza’s lip, notched down to just below the water line at each spout */
const notched = (point: ProfilePoint, angle: number): ProfilePoint => {
  const [radius, y] = point
  if (radius < tazza.innerRadius - 1e-6 || y <= tazza.spoutFloor) {
    return point
  }
  return [radius, y - (y - tazza.spoutFloor) * spoutOpening(angle)]
}
/** a vertex attribute with the same value everywhere */
const constantAttribute = (count: number, value: number) => new Float32BufferAttribute(Array.from({length: count}, () => value), 1)
/** speed of the falling water in a ribbon at an age */
const ribbonSpeed = (age: number) => Math.hypot(ribbon.outward, gravity * age)
/**
 * Per-vertex water data: UV v is the water’s age in seconds; `waterFall` is the fraction of its fall already behind it, which tears veils apart;
 * `waterAir` is how much air it has taken in, which turns it white; `waterLens` is how much it bends the view through it.
 */
function waterPart(geometry: BufferGeometry, {air, duration, lens, tears}: {
  /** how much air the water has taken in at a fraction of its flight */
  air: (progress: number) => number
  duration: number
  /** how much the stream bends the view through it like a glass rod, 1 for round streams and 0 for thin sheets */
  lens: number
  /** how far the stream tears apart by the end of its fall, 0 for not at all and 1 for a veil frayed into strands */
  tears: number
}) {
  const uv = geometry.getAttribute('uv')
  const fall = new Float32Array(uv.count)
  const airs = new Float32Array(uv.count)
  for (let i = 0; i < uv.count; i++) {
    const progress = Math.min(1, Math.max(0, uv.getY(i) / duration))
    fall[i] = progress * tears
    airs[i] = Math.min(1, Math.max(0, air(progress)))
  }
  geometry.setAttribute('waterFall', new Float32BufferAttribute(fall, 1))
  geometry.setAttribute('waterAir', new Float32BufferAttribute(airs, 1))
  geometry.setAttribute('waterLens', constantAttribute(uv.count, lens))
  return geometry
}
/** The cup’s brim spills all around as a thin bell, drawn as a revolved line: a seamless, double-sided curtain. */
function bell(sheet: WaterSheet, around: number, samples: number) {
  const duration = sheetFlightTime(sheet)
  const ages = Array.from({length: samples + 1}, (_, i) => duration * i / samples)
  return waterPart(new ShapedLatheGeometry(ages.map(age => sheetPoint(sheet, age)), {
    segments: around,
    uv: (point, fraction) => [fraction, ages[point]],
  }), {
    duration,
    air: progress => 0.06 + progress ** 2 * 0.55,
    lens: 0,
    tears: 1,
  })
}
/**
 * A stream of water along a path, as a tube of elliptical cross section: `center` and `size` give its middle and its [width, depth] at an age.
 * The width lies around the axis, the depth across the path in the fountain’s radial plane.
 */
function stream({ages, center, size, angle, sides}: {
  ages: ReadonlyArray<number>
  angle: number
  center: (age: number) => ProfilePoint
  sides: number
  size: (age: number) => readonly [number, number]
}) {
  const positions: Array<number> = []
  const normals: Array<number> = []
  const uvs: Array<number> = []
  const indices: Array<number> = []
  const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle))
  const side = new Vector3(-Math.sin(angle), 0, Math.cos(angle))
  const tangent = new Vector3
  const across = new Vector3
  const point = new Vector3
  const normal = new Vector3
  const toPoint = (age: number, target: Vector3) => {
    const [r, y] = center(age)
    return target.copy(radial).multiplyScalar(r).setY(y)
  }
  const ahead = new Vector3
  const behind = new Vector3
  for (const age of ages) {
    toPoint(Math.min(age + 1e-3, ages.at(-1)!), ahead)
    toPoint(Math.max(age - 1e-3, 0), behind)
    tangent.subVectors(ahead, behind).normalize()
    // Across the path in the radial plane: perpendicular to both the travel and the stream’s width.
    across.crossVectors(side, tangent).normalize()
    toPoint(age, point)
    const [width, depth] = size(age)
    for (let j = 0; j <= sides; j++) {
      const theta = j / sides * 2 * Math.PI
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      positions.push(
        point.x + side.x * cos * width / 2 + across.x * sin * depth / 2,
        point.y + across.y * sin * depth / 2,
        point.z + side.z * cos * width / 2 + across.z * sin * depth / 2,
      )
      // The normal of an ellipse leans toward its narrow side.
      normal.copy(side).multiplyScalar(cos / Math.max(width, 1e-4)).addScaledVector(across, sin / Math.max(depth, 1e-4)).normalize()
      normals.push(normal.x, normal.y, normal.z)
      uvs.push(j / sides, age)
    }
  }
  const columns = sides + 1
  for (let row = 0; row < ages.length - 1; row++) {
    for (let j = 0; j < sides; j++) {
      const a = row * columns + j
      const b = a + columns
      // Counterclockwise seen from outside: around the ellipse from `side` toward `across`, then along the travel.
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  const geometry = new BufferGeometry
  geometry.setIndex(indices)
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}
/** Ribbons pour from the tazza’s spouts and narrow and thin as the falling water speeds up. */
function ribbonStream(angle: number) {
  const sheet = ribbonSheet
  const duration = sheetFlightTime(sheet)
  const ages = Array.from({length: 11}, (_, i) => duration * (i / 10) ** 1.2)
  // Starting in the notch, so the ribbon grows out of the water standing in it.
  const center = (age: number): ProfilePoint => (age === 0 ? [ribbon.radius - 0.03, sheet.y] : sheetPoint(sheet, age))
  return waterPart(stream({
    angle,
    ages,
    center,
    sides: 8,
    size: age => {
      // Continuity: the cross section shrinks with the speed, mostly in width as surface tension pulls the ribbon round.
      const ratio = ribbonSpeed(0) / ribbonSpeed(age)
      return [ribbon.width * ratio ** 0.7, ribbon.depth * ratio ** 0.3]
    },
  }), {
    duration,
    air: progress => 0.04 + progress ** 2 * 0.5,
    lens: 0.6,
    // Ribbons hold together down to the basin, only fraying at their edges.
    tears: 0.45,
  })
}
/** A laminar jet arcing from a nozzle on the coping into the basin. */
function arcStream(angle: number) {
  const ages = Array.from({length: 17}, (_, i) => arc.duration * i / 16)
  return waterPart(stream({
    angle,
    ages,
    center: age => arcPoint(arc, age),
    sides: 6,
    size: () => [fountain.arcRadius * 2, fountain.arcRadius * 2],
  }), {
    duration: arc.duration,
    air: () => 0,
    lens: 1,
    tears: 0,
  })
}
/** The jet narrows with height by continuity until it slows, swells and ends in a rounded crown below its apex. */
function crownJet(samples: number) {
  const rise = jet.speed ** 2 / (2 * gravity)
  const heights = Array.from({length: samples + 1}, (_, i) => rise * jet.solid * (1 - (1 - i / samples) ** 1.6))
  const age = (height: number) => (jet.speed - Math.sqrt(jet.speed ** 2 - 2 * gravity * height)) / gravity
  const radius = (height: number) => jet.radius * Math.sqrt(jet.speed / Math.sqrt(jet.speed ** 2 - 2 * gravity * height))
  const top = heights.at(-1)!
  const crown = radius(top)
  // From the tip down, so that the outside of the column is on the left of travel.
  const points: Array<[number, number, number]> = [
    [0, jet.y + top + crown, age(top)],
    [crown * 0.75, jet.y + top + crown * 0.66, age(top)],
    ...heights.toReversed().map((height): [number, number, number] => [radius(height), jet.y + height, age(height)]),
  ]
  return waterPart(new ShapedLatheGeometry(points.map(([r, y]) => [r, y]), {
    segments: 10,
    uv: (point, around) => [around, points[point][2]],
  }), {
    duration: age(top),
    air: progress => 0.15 + progress * 0.55,
    lens: 1,
    tears: 0,
  })
}
/**
 * A still water surface out to `edge(angle)`, in rings so its vertices can ripple.
 * `splashRing` is the distance from the axis of a ring where falling water lands in it, or −1; `splashPoints` is 1 on the basin, where the ribbons and arcs land.
 */
function pool(y: number, around: number, edge: (angle: number) => number, splashRing: number, splashPoints: number) {
  const rings = [0, 0.3, 0.6, 0.85, 1]
  const geometry = new ShapedLatheGeometry(rings.map(t => [t, y]), {
    segments: around,
    shape: (point, angle) => [rings[point] * edge(angle), y],
  })
  const count = geometry.getAttribute('position').count
  geometry.setAttribute('splashRing', constantAttribute(count, splashRing))
  geometry.setAttribute('splashPoints', constantAttribute(count, splashPoints))
  return geometry
}
const up = new Vector3(0, 1, 0)

/**
 * The Lobby fountain, merged into one geometry per material: carved marble, gilt bronze, standing water and falling water.
 *
 * The lobed basin, the gadrooned bowls and the notched lip are smooth lathes shaped per angle; the plinth is a crisp octagon.
 */
export default class FountainGeometry {
  static readonly profiles = profiles
  /** A gilt nozzle on the coping, aimed along the arc’s launch at `angle`. */
  static nozzle(angle: number) {
    const geometry = new ShapedLatheGeometry(profiles.nozzle, {segments: fountainSegments.nozzle})
    const [radial, vertical] = arcVelocity(arc)
    const direction = new Vector3(radial * Math.cos(angle), vertical, radial * Math.sin(angle))
    direction.normalize()
    const [r, y] = arc.from
    const orientation = new Quaternion
    orientation.setFromUnitVectors(up, direction)
    const placement = new Matrix4
    placement.compose(new Vector3(r * Math.cos(angle), y, r * Math.sin(angle)), orientation, new Vector3(1, 1, 1))
    geometry.applyMatrix4(placement)
    return geometry
  }
  readonly gilt: BufferGeometry
  readonly pools: BufferGeometry
  readonly stone: BufferGeometry

  readonly water: BufferGeometry

  constructor() {
    this.stone = mergeParts([
      new ShapedLatheGeometry(profiles.step, {segments: fountainSegments.step}),
      new ShapedLatheGeometry(profiles.basin, {
        segments: fountainSegments.basin,
        shape: (point, angle) => lobed(profiles.basin[point], angle),
      }),
      new RevolvedProfileGeometry(profiles.plinth, {sides: 8}),
      new ShapedLatheGeometry(profiles.baluster, {segments: fountainSegments.baluster}),
      new ShapedLatheGeometry(profiles.tazza, {
        segments: fountainSegments.tazza,
        // The underside starts after the roll below the lip.
        shape: (point, angle) => (point > 9 ? gadrooned(profiles.tazza[point], angle, tazza.gadroons, 0.022, 0.14, tazza.radius - 0.03) : notched(profiles.tazza[point], angle)),
      }),
      new ShapedLatheGeometry(profiles.stem, {segments: fountainSegments.stem}),
      new ShapedLatheGeometry(profiles.cup, {
        segments: fountainSegments.cup,
        shape: (point, angle) => (point > 7 ? gadrooned(profiles.cup[point], angle, cup.gadroons, 0.014, 0.04, cup.radius - 0.012) : profiles.cup[point]),
      }),
    ])
    this.gilt = mergeParts([
      new ShapedLatheGeometry(profiles.finial, {segments: fountainSegments.finial}),
      ...Array.from({length: fountain.lobes}, (_, i) => FountainGeometry.nozzle(jetAngle(i))),
    ])
    this.pools = mergeParts([
      // The basin surface tucks into the lobed stone instead of leaving a sliver at the walls; the bowls brim over their lips.
      pool(pools.basin, fountainSegments.basin, angle => basinRadius(angle) + 0.004, -1, 1),
      pool(pools.tazza, fountainSegments.tazza, angle => tazza.innerRadius + 0.006 + (ribbon.radius - tazza.innerRadius - 0.006) * spoutOpening(angle), sheetLanding(veil), 0),
      pool(pools.cup, fountainSegments.cup, () => veil.radius, 0, 0),
    ])
    this.water = mergeParts([
      bell(veil, fountainSegments.cup, 8),
      ...Array.from({length: fountain.spouts}, (_, i) => ribbonStream(spoutAngle(i))),
      ...Array.from({length: fountain.lobes}, (_, i) => arcStream(jetAngle(i))),
      crownJet(10),
    ])
  }

  dispose() {
    this.stone.dispose()
    this.gilt.dispose()
    this.pools.dispose()
    this.water.dispose()
  }
}
