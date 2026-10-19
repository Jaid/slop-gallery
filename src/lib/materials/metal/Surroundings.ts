import type {ColorRepresentation, NodeBuilder} from 'three/webgpu'

import {atan, clamp, float, floor, fract, hash, materialEnvIntensity, max, min, mix, mx_noise_float, positionWorld, reflectVector, select, vec2, vec3} from 'three/tsl'
import {Color, Node} from 'three/webgpu'

/**
 * A simplified room that a metal mirrors instead of a real environment map: a floor, a ring of walls and a ceiling with light panels.
 *
 * All colors are what the surface looks like on screen, so an unlit sample of the room reads as its real counterpart. Distances are in meters and measured from the metal, which places the room’s horizon, tiles and lights where they would be seen in a real mirror.
 */
export type Surroundings = {
  ceiling: {
    color: ColorRepresentation
    /** ceiling height above the floor */
    height: number
    lights: {
      color: ColorRepresentation
      /** radiance multiplier of the light panels relative to their color; above 1 they are brighter than any wall */
      intensity: number
      /** world x and z of one panel’s center, which aligns the grid with the real fixtures */
      origin?: readonly [number, number]
      /** width and depth of one panel */
      size: readonly [number, number]
      /** center distance of the panel grid along x and z */
      spacing: readonly [number, number]
    }
  }
  /**
   * Radius in meters of the shade that the metal and whatever it belongs to cast on the floor around it, which darkens the mirrored floor close by.
   *
   * Without it, a bar standing on a bright floor mirrors that floor at full brightness right down to its foot, which reads as chalky paint instead of metal.
   */
  contact?: number
  floor: {
    /** second tile color for a checkerboard; leave out for a uniform floor */
    checker?: ColorRepresentation
    color: ColorRepresentation
    /** world x and z of a tile corner, which aligns the tiles with the real floor */
    origin?: readonly [number, number]
    /** grout between tiles; leave out for a seamless floor */
    seam?: ColorRepresentation
    /** edge length of the square tiles */
    tile: number
    /** amount of soft, marbled lightness variation, 0–1 */
    veining?: number
    /** world height of the floor, from which the metal’s own height and the ceiling height are measured */
    y: number
  }
  walls: {
    /** artwork and doorway colors that hang along the walls */
    accents: ReadonlyArray<ColorRepresentation>
    /** skirting at the foot of the walls */
    baseboard: ColorRepresentation
    color: ColorRepresentation
    /** horizontal distance from the metal to the surrounding walls */
    distance: number
  }
}
type Float = Node<'float'>
type Vec2 = Node<'vec2'>

type Vec3 = Node<'vec3'>

const tau = Math.PI * 2
const rgb = (value: ColorRepresentation) => vec3(...new Color(value))
/** Average color of the accents, which every accent fades into once it is too blurry to tell apart. */
const accentAverage = (accents: ReadonlyArray<ColorRepresentation>) => {
  const nodes = accents.map(accent => rgb(accent))
  let sum: Vec3 = vec3(0)
  for (const node of nodes) {
    sum = sum.add(node)
  }
  return sum.div(Math.max(1, nodes.length))
}
/** Pixel and blur filtered 0–1 coverage of the region where the signed distance `d` is negative, `width` being the blur in the same unit. */
const coverage = (d: Float, width: Float) => clamp(float(0.5).sub(d.div(width.max(1e-5))), 0, 1)
/** Signed distance to a centered rectangle of the half size `half`. */
const box = (p: Vec2, half: Vec2) => {
  const q = p.abs().sub(half)
  return max(q.x, q.y)
}
/**
 * Fades a pattern of feature `size` into its average once `blur` is far beyond it, instead of letting it ring or alias.
 *
 * Up to about the feature size, the filtered coverage of every pattern already blurs it correctly, so it only takes over where several features fall into one blur.
 */
const settle = <T extends Float | Vec3>(pattern: T, average: T, blur: Float, size: number) => mix(pattern, average, blur.smoothstep(size * 0.7, size * 2.5)) as T

/**
 * Radiance mirrored along the world direction `direction`, blurred over a cone of `spread` radians.
 *
 * The direction is traced from the shaded point to the floor plane, to a cylinder of walls around it, or to the ceiling, whichever comes first, so tiles and lights keep their real size and slide past correctly as the object or camera moves. Every pattern is softened by the blur cone at its distance and by the pixel footprint, and fades to its average color before it could alias.
 */
export function surroundingsRadiance(room: Surroundings, direction: Vec3, spread: Float) {
  const d = direction.normalize()
  const height = positionWorld.y.sub(room.floor.y).max(0.005)
  const lengthXz = max(d.xz.length(), float(1e-3))
  const wallT = float(room.walls.distance).div(lengthXz)
  // Height above the floor where the ray meets the walls; below 0 it hits the floor first, above the ceiling the ceiling.
  const wallY = height.add(d.y.mul(wallT)).toVar()
  const wallBlur = wallT.mul(spread).add(wallY.fwidth()).max(1e-4)
  const floorWeight = coverage(wallY, wallBlur)
  const ceilingWeight = coverage(float(room.ceiling.height).sub(wallY), wallBlur)
  // Walls: a ring with an even number of bays, so the cell pattern wraps seamlessly around the azimuth.
  const bayWidth = 3
  const bays = Math.max(2, Math.round(tau * room.walls.distance / bayWidth / 2) * 2)
  const around = atan(d.z, d.x).div(tau).mul(bays)
  const aroundWidth = min(around.fwidth(), fract(around.add(0.5)).fwidth())
  const meters = tau * room.walls.distance / bays
  const bay = fract(around).sub(0.5).mul(meters)
  const bayIndex = floor(around).add(bays).mod(bays)
  const bayBlur = wallT.mul(spread).add(aroundWidth.mul(meters)).max(1e-4)
  const kind = hash(bayIndex.add(17.3))
  const accents = room.walls.accents.map(accent => rgb(accent))
  let accent: Vec3 = accents[0] ?? rgb(room.walls.color)
  for (const [index, candidate] of accents.entries()) {
    accent = select(hash(bayIndex.add(3.1)).mul(accents.length).floor().equal(index), candidate, accent)
  }
  // Two out of three bays carry an artwork at eye height, a few a tall doorway, the rest stay plain.
  const artworkWidth = hash(bayIndex.add(5.7)).mul(0.7).add(0.7)
  const artwork = coverage(box(vec2(bay, wallY.sub(1.65)), vec2(artworkWidth.mul(0.5), 0.5)), bayBlur).mul(kind.lessThan(0.62).select(1, 0))
  const doorway = coverage(box(vec2(bay, wallY.sub(1.2)), vec2(0.6, 1.2)), bayBlur).mul(kind.greaterThan(0.85).select(1, 0))
  const baseboard = coverage(wallY.sub(0.12), wallBlur)
  const wallTexture = mx_noise_float(vec3(around.mul(meters).mul(0.4), wallY.mul(0.6), 0)).mul(0.08).add(1)
  let wall: Vec3 = rgb(room.walls.color).mul(settle(wallTexture, float(1), wallBlur, 2.5))
  const accentMix = settle(max(artwork, doorway), float(0.62 * 0.6 * 0.85 + 0.15 * 0.8 * 0.4), bayBlur, 0.8)
  wall = mix(wall, settle(accent, accentAverage(room.walls.accents), bayBlur, 0.8), accentMix)
  wall = mix(wall, rgb(room.walls.baseboard), baseboard)
  // Floor: the plane under the metal, tiled, optionally checkered and marbled.
  const floorT = min(height.div(max(d.y.negate(), float(1e-3))), wallT)
  const floorPoint = positionWorld.xz.add(d.xz.mul(floorT))
  const tile = floorPoint.sub(vec2(...room.floor.origin ?? [0, 0])).div(room.floor.tile)
  const tileBlur = floorT.mul(spread).div(room.floor.tile).add(tile.fwidth().length()).max(1e-4)
  const floorBase = rgb(room.floor.color)
  let floorColor: Vec3 = floorBase
  if (room.floor.checker !== undefined) {
    const checker = rgb(room.floor.checker)
    // A filtered checkerboard: the product of two filtered square waves.
    const wave = (x: Float) => clamp(fract(x.mul(0.5)).sub(0.5).abs().sub(0.25).div(tileBlur.mul(0.5)), -1, 1)
    const parity = wave(tile.x).mul(wave(tile.y)).mul(0.5).add(0.5)
    floorColor = settle(mix(floorBase, checker, parity), floorBase.add(checker).mul(0.5), tileBlur, 0.6)
  }
  if (room.floor.veining) {
    const vein = mx_noise_float(vec3(floorPoint.mul(vec2(1.4, 0.5)), 3.7)).abs().oneMinus().pow(6)
    // Curved metal squeezes meters of floor into a pixel, so the veins fade by the pixel footprint as much as by the blur.
    const veinBlur = floorT.mul(spread).add(floorPoint.fwidth().length())
    floorColor = floorColor.mul(settle(vein.mul(room.floor.veining).oneMinus(), float(1 - room.floor.veining * 0.12), veinBlur, 0.4))
  }
  if (room.floor.seam !== undefined) {
    const seamDistance = fract(tile.sub(0.5)).sub(0.5).abs().mul(room.floor.tile)
    const seam = coverage(min(seamDistance.x, seamDistance.y).sub(0.002), floorT.mul(spread).add(tile.fwidth().length().mul(room.floor.tile)).max(1e-4))
    floorColor = mix(floorColor, rgb(room.floor.seam), settle(seam, float(0.004 / room.floor.tile), tileBlur, 0.05))
  }
  // Ceiling: a plain plane with a grid of glowing panels, the brightest thing a metal can mirror.
  const {lights} = room.ceiling
  const ceilingT = min(float(room.ceiling.height).sub(height).max(0.01).div(max(d.y, float(1e-3))), wallT)
  const ceilingPoint = positionWorld.xz.add(d.xz.mul(ceilingT))
  const cell = fract(ceilingPoint.sub(vec2(...lights.origin ?? [0, 0])).div(vec2(...lights.spacing)).add(0.5)).sub(0.5).mul(vec2(...lights.spacing))
  const ceilingBlur = ceilingT.mul(spread).add(ceilingPoint.fwidth().length()).max(1e-4)
  const panelShare = lights.size[0] * lights.size[1] / (lights.spacing[0] * lights.spacing[1])
  const panel = settle(coverage(box(cell, vec2(lights.size[0] / 2, lights.size[1] / 2)), ceilingBlur), float(panelShare), ceilingBlur, Math.min(...lights.size))
  const ceiling = mix(rgb(room.ceiling.color), rgb(lights.color).mul(lights.intensity), panel)
  if (room.contact) {
    // The mirrored floor darkens toward the metal’s foot, like the soft shadow and occlusion it really has there.
    const shade = floorT.mul(lengthXz).div(room.contact).smoothstep(0, 1).mul(0.6).add(0.4)
    floorColor = floorColor.mul(shade)
  }
  const lower = mix(wall, floorColor, floorWeight)
  return mix(lower, ceiling, ceilingWeight)
}

/** Blur cone half-angle in radians for a GGX roughness, matched by eye to the PMREM blur of real environment maps. */
export const roughnessSpread = (roughness: Float) => roughness.mul(roughness).mul(1.4).add(0.004)

/**
 * A procedural environment for physically based materials: assigned as `envNode`, it is sampled by three’s image-based lighting exactly like a prefiltered environment map, along the reflection (and clearcoat or anisotropic) directions it asks for and with a blur that follows the roughness it reports.
 *
 * Outside a lighting context it falls back to the plain reflection vector without blur, which also makes it usable as a color in unlit materials.
 */
export class SurroundingsNode extends Node<'vec3'> {
  /** additional blur in radians on top of the roughness, for finishes whose grain smears reflections further than their roughness says */
  readonly extraSpread: Float | null
  readonly intensity: number
  readonly room: Surroundings
  constructor(room: Surroundings, intensity = 1, extraSpread: Float | null = null) {
    super('vec3')
    this.room = room
    this.intensity = intensity
    this.extraSpread = extraSpread
  }
  // eslint-disable-next-line typescript/class-literal-property-style -- three’s nodes report their type through a static getter.
  static get type() {
    return 'SurroundingsNode'
  }
  override setup(builder: NodeBuilder) {
    const context = builder.context as {
      getTextureLevel?: (node: Node) => Float
      getUV?: (node: Node, builder: NodeBuilder) => Vec3
    }
    const direction = context.getUV?.(this, builder) ?? reflectVector
    const level = context.getTextureLevel?.(this) ?? float(0)
    // Image-based lighting scales any environment without a texture by the scene’s environment intensity; this room carries its own.
    const sceneIntensity = context.getUV ? max(materialEnvIntensity, float(1e-3)) : float(1)
    const spread = this.extraSpread ? roughnessSpread(level).add(this.extraSpread) : roughnessSpread(level)
    return surroundingsRadiance(this.room, direction, spread).mul(this.intensity).div(sceneIntensity)
  }
}
