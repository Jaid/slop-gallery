import type {MarbleStyle} from './marble.ts'

import {float, hash, max, mix, mx_noise_float, normalWorldGeometry, positionWorld, vec2, vec3} from 'three/tsl'
import {Color} from 'three/webgpu'

import {heightNormal, line, visibleDetail} from '../filters.ts'
import FloorMaterial from '../FloorMaterial.ts'
import {calacatta, marblePattern, portoro, shadeMarble} from './marble.ts'

export type CheckeredMarbleFloorOptions = {
  /** cut of the tiles whose column and row add up to an odd number */
  dark?: MarbleStyle
  /** cut of the tiles whose column and row add up to an even number, including the one at `origin` */
  light?: MarbleStyle
  /** a corner of the tile grid in world x/z */
  origin: readonly [number, number]
  /** whether the polished floor mirrors the room (heavy mode) */
  reflections?: boolean
  seed?: number
  /** edge length of the square tiles, in meters */
  tile: number
}

/** half-width of the grout joint between two tiles, in meters */
const groutHalfWidth = 0.0022
/** the tiles’ eased arrises fall this far toward the joint, for the shading normal */
const arrisDepth = 0.0006

/**
 * The tile of a checkered grid that covers a world point, and whether it is cut from the dark stone.
 *
 * Kept on the CPU too, so tests can check the pattern against the room.
 */
export function checkeredTile(x: number, z: number, {origin, tile}: Pick<CheckeredMarbleFloorOptions, 'origin' | 'tile'>) {
  const column = Math.floor((x - origin[0]) / tile)
  const row = Math.floor((z - origin[1]) / tile)
  return {
    column,
    row,
    dark: (column + row) % 2 !== 0,
  }
}

/**
 * Polished checkered marble, alternating a light and a dark cut, mapped by world position so the pattern stays put however the floor is split into slabs.
 *
 * Every tile is cut from another part of its block and turned at random, so neighbors never continue each other’s veins. Tiles are set with hairline grout and eased arrises. In heavy mode the polish mirrors the room, bent faintly by the waviness of hand-polished stone; the grout stays matte.
 */
export default class CheckeredMarbleFloorMaterial extends FloorMaterial {
  constructor({dark = portoro, light = calacatta, origin, reflections = true, seed = 0, tile}: CheckeredMarbleFloorOptions) {
    if (!(tile > 0)) {
      throw new RangeError('Marble tiles need a positive size.')
    }
    const x = positionWorld.x.sub(origin[0]).toVar('marbleFloorX')
    const z = positionWorld.z.sub(origin[1]).toVar('marbleFloorZ')
    const cell = vec2(x, z).div(tile).floor().toVar('marbleFloorTile')
    // 1 on dark tiles, 0 on light ones. The cuts are blended by it rather than picked with `select`: variables declared inside one branch of a `select` read as zero in the other.
    const darkness = cell.x.add(cell.y).mod(2).abs().round().toVar('marbleFloorDarkness')
    // Hashes need non-negative seeds below 2²⁴; the offset keeps every tile of a ±500 m floor positive.
    const tileId = cell.x.mul(1009).add(cell.y).add(800_011 + seed * 7919).toVar('marbleFloorTileId')
    const random = (stream: number) => hash(tileId.add(stream * 1_048_573))
    const local = vec2(x, z).sub(cell.add(0.5).mul(tile)).toVar('marbleFloorLocal')
    const angle = random(1).mul(Math.PI * 2)
    const direction = vec2(angle.cos(), angle.sin())
    const u = local.dot(direction).add(random(2).mul(200))
    const v = local.dot(vec2(direction.y.negate(), direction.x)).add(random(3).mul(200))
    const footprint = max(positionWorld.x.fwidth(), positionWorld.z.fwidth()).toVar('marbleFloorFootprint')
    // Both cuts share one pattern; each tile shades it in its own stone, so the costly noise runs once per pixel.
    const pattern = marblePattern({
      footprint,
      seed: random(4).mul(50),
      u,
      v,
      veinWidth: mix(float(light.veinWidth), float(dark.veinWidth), darkness),
    })
    const lightStone = shadeMarble(pattern, light)
    const darkStone = shadeMarble(pattern, dark)
    // Distance to the nearest tile edge; neighbors mirror it, so a band around zero is the joint.
    const edge = float(tile / 2).sub(local.abs().x.max(local.abs().y)).toVar('marbleFloorEdge')
    const grout = line(edge, groutHalfWidth).toVar('marbleFloorGrout')
    // Only the top face mirrors the room and shows the pattern.
    const top = normalWorldGeometry.y.step(0.5)
    const roughness = reflections ? 0.1 : 0.3
    super(null, {
      color: '#ffffff',
      roughness,
      reflection: reflections ? {
        strength: 0.1,
        grazingStrength: 0.6,
        // Polished, but not glass: the lamps and frames mirror crisply, with a slight bloom.
        blur: 1.5,
        mask: grout.oneMinus().mul(top),
      } : undefined,
    })
    // Tiles are sorted by tone, but each is a shade off its neighbors.
    const tone = random(5).sub(0.5).mul(0.05).add(1)
    const stone = mix(lightStone.color, darkStone.color, darkness).mul(tone).toVec3()
    const vein = mix(lightStone.vein, darkStone.vein, darkness)
    // The eased arris catches a sliver of shadow along every joint.
    const arrisShade = mix(float(1), edge.smoothstep(0, 0.005).mul(0.35).add(0.65), visibleDetail(footprint, 0.01))
    const sawn = new Color(dark.base)
    const groutColor = new Color('#2b2724')
    this.colorNode = mix(mix(vec3(sawn.r, sawn.g, sawn.b), stone.mul(arrisShade).toVec3(), top), vec3(groutColor.r, groutColor.g, groutColor.b), grout.mul(top))
    this.roughnessNode = mix(float(roughness).add(vein.mul(0.05)), float(0.8), grout)
    // The arrises are eased toward the joint, and hand-polished stone is never quite flat: both bend the mirrored lights.
    const arris = edge.smoothstep(0, 0.005).oneMinus().mul(-arrisDepth).mul(visibleDetail(footprint, 0.008))
    const waviness = mx_noise_float(vec3(x.mul(4), z.mul(4), random(6).mul(40))).mul(0.00012).mul(visibleDetail(footprint, 0.05))
    this.normalNode = heightNormal(arris.add(waviness).mul(top))
  }
}
