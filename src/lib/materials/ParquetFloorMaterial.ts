import type {Node} from 'three/webgpu'

import {color, float, hash, max, min, mix, mx_noise_float, normalWorldGeometry, positionWorld, select, vec3} from 'three/tsl'

import {line, visibleDetail, worldNormalToView} from './filters.ts'
import FloorMaterial from './FloorMaterial.ts'

export type ParquetOptions = {
  /** eased edge of every block, in meters */
  bevel: number
  colors: {
    dark: string
    light: string
    ring: string
    seam: string
  }
  /** block length as a whole multiple of its width */
  ratio: number
  /** half-width of the dark joint between blocks, in meters */
  seam: number
  /** decorrelates two floors that share a layout */
  seed: number
  /** block width, in meters */
  width: number
}

type Float = Node<'float'>

export const salonParquet: ParquetOptions = {
  width: 0.07,
  ratio: 6,
  bevel: 0.0025,
  seam: 0.0012,
  seed: 5,
  colors: {
    dark: '#6b4523',
    light: '#a9773f',
    ring: '#4a2c14',
    seam: '#1c1007',
  },
}

/**
 * Which herringbone block covers a point, in block-width units. Blocks are `ratio` × 1. Horizontal blocks start at (k, k) and
 * vertical ones at (k + ratio, k + 1 − ratio), so each chain climbs diagonally; the chains repeat every (ratio, −ratio).
 *
 * A point can only fall into the horizontal or vertical block of its own chain, or the vertical block of the previous one.
 */
export function herringboneBlock(x: number, y: number, ratio: number) {
  const chain = Math.floor((x - y + 1) / (2 * ratio))
  const chainX = x - chain * ratio
  const chainY = y + chain * ratio
  const step = Math.floor(chainY)
  if (chainX - step >= 0 && chainX - step < ratio) {
    return {
      chain,
      step,
      vertical: false,
      along: chainX - step,
      across: chainY - step,
    }
  }
  const ownStep = Math.floor(chainX) - ratio
  const inOwn = chainY - ownStep >= 1 - ratio && chainY - ownStep < 1
  const x0 = inOwn ? chainX : chainX + ratio
  const y0 = inOwn ? chainY : chainY - ratio
  const verticalStep = Math.floor(x0) - ratio
  return {
    chain: inOwn ? chain : chain - 1,
    step: verticalStep,
    vertical: true,
    along: y0 - verticalStep - 1 + ratio,
    across: x0 - verticalStep - ratio,
  }
}

/**
 * Oak herringbone parquet, mapped by world position so the pattern stays put however the floor is split into meshes.
 *
 * The blocks run at 45° to the walls, so the zigzag spines run along the room’s z axis. Every block has its own tone, figure and
 * grain direction. Joints are filtered against the pixel footprint and the eased edges flatten before they could shimmer.
 */
export default class ParquetFloorMaterial extends FloorMaterial {
  constructor(readonly options: ParquetOptions = salonParquet, reflections = true) {
    const roughness = reflections ? 0.32 : 0.62
    super(null, {
      color: '#ffffff',
      roughness,
      // Oiled oak, not lacquer: the laylight panes overhead should only show as a soft sheen, never as crisp mirrored tiles.
      reflection: reflections ? {
        strength: 0.02,
        grazingStrength: 0.16,
        blur: 4,
      } : undefined,
    })
    const {bevel, colors, ratio, seam, seed, width} = options
    if (!Number.isInteger(ratio) || ratio < 2 || !(width > 0)) {
      throw new RangeError('Parquet blocks need a positive width and a whole-number length ratio of at least 2.')
    }
    // Block-width units in a frame turned 45° about the vertical.
    const diagonal = Math.SQRT1_2 / width
    const x = positionWorld.x.add(positionWorld.z).mul(diagonal).toVar('parquetX')
    const y = positionWorld.z.sub(positionWorld.x).mul(diagonal).toVar('parquetY')
    const chain = x.sub(y).add(1).div(2 * ratio).floor().toVar('parquetChain')
    const chainX = x.sub(chain.mul(ratio)).toVar('parquetChainX')
    const chainY = y.add(chain.mul(ratio)).toVar('parquetChainY')
    const step = chainY.floor()
    const horizontalAlong = chainX.sub(step)
    const horizontal = horizontalAlong.greaterThanEqual(0).and(horizontalAlong.lessThan(ratio)).toVar('parquetHorizontal')
    const ownStep = chainX.floor().sub(ratio)
    const inOwn = chainY.sub(ownStep).greaterThanEqual(1 - ratio).and(chainY.sub(ownStep).lessThan(1))
    const verticalX = select(inOwn, chainX, chainX.add(ratio))
    const verticalY = select(inOwn, chainY, chainY.sub(ratio))
    const verticalStep = verticalX.floor().sub(ratio)
    // Block-local coordinates in meters: u runs along the block from its center, v across it.
    const along = select(horizontal, horizontalAlong, verticalY.sub(verticalStep).sub(1 - ratio)).toVar('parquetAlong')
    const across = select(horizontal, chainY.sub(step), verticalX.sub(verticalStep).sub(ratio)).toVar('parquetAcross')
    const length = ratio * width
    const u = along.sub(ratio / 2).mul(width).toVar('parquetU')
    const v = across.sub(0.5).mul(width).toVar('parquetV')
    // Hashes need non-negative seeds below 2²⁴; the offset keeps every block of a ±150 m floor positive.
    const blockChain = select(horizontal.or(inOwn), chain, chain.sub(1))
    const blockStep = select(horizontal, step, verticalStep)
    const blockId = blockChain.mul(4099).add(blockStep.mul(2)).add(select(horizontal, float(0), float(1))).add(1_000_003 + seed * 7919).toVar('parquetBlock')
    const random = (stream: number) => hash(blockId.add(stream * 1_048_573))
    const footprint = max(positionWorld.x.fwidth(), positionWorld.z.fwidth()).toVar('parquetFootprint')
    const edge = min(float(width / 2).sub(v.abs()), float(length / 2).sub(u.abs())) as Float
    const joint = line(edge, seam)
    // Rift-sawn oak: fine straight rings along the block, wandering only a little, plus the silvery ray flecks of quartered oak.
    const blockSeed = random(1).mul(97)
    const meander = mx_noise_float(vec3(u.mul(1.5), v.mul(9), blockSeed)).mul(3)
    const ringPhase = v.mul(260).add(meander).toVar('parquetRings')
    const rings = mix(ringPhase.sin().mul(0.5).add(0.5).pow(4), float(0.18), ringPhase.fwidth().smoothstep(0.8, 2.4))
    const fleckNoise = mx_noise_float(vec3(u.mul(40), v.mul(6), blockSeed.add(7))).mul(0.5).add(0.5)
    const flecks = mix(fleckNoise.smoothstep(0.72, 0.9), float(0.04), visibleDetail(footprint, 0.01).oneMinus())
    const figure = mx_noise_float(vec3(u.mul(2), v.mul(14), blockSeed.add(3))).mul(0.5).add(0.5)
    // Blocks are sorted by tone, but not strictly: a few darker and lighter ones break up the field.
    const tone = random(2).mul(0.26).add(0.86).mul(select(random(3).lessThan(0.08), float(0.82), float(1)))
    const hue = random(4)
    const wear = mx_noise_float(vec3(positionWorld.x.mul(0.3), positionWorld.z.mul(0.3), seed)).mul(0.06).add(1)
    const timber = mix(color(colors.dark), color(colors.light), figure.mul(0.55).add(hue.mul(0.45)))
    const grained = mix(timber, color(colors.ring), rings.mul(0.4)).add(flecks.mul(0.06)).mul(tone).mul(wear)
    this.colorNode = mix(grained, color(colors.seam), joint)
    this.roughnessNode = float(roughness).sub(rings.mul(0.05)).add(joint.mul(0.12)).add(random(5).sub(0.5).mul(0.06))
    // Eased edges tilt the normal toward each joint, in the block’s own directions.
    const relief = visibleDetail(footprint, bevel * 2)
    const diagonalX = vec3(Math.SQRT1_2, 0, Math.SQRT1_2)
    const diagonalY = vec3(-Math.SQRT1_2, 0, Math.SQRT1_2)
    const alongAxis = select(horizontal, diagonalX, diagonalY)
    const acrossAxis = select(horizontal, diagonalY, diagonalX)
    const tiltU = u.sign().mul(u.abs().smoothstep(length / 2 - bevel, length / 2)).mul(0.4)
    const tiltV = v.sign().mul(v.abs().smoothstep(width / 2 - bevel, width / 2)).mul(0.4)
    const shading = normalWorldGeometry.add(alongAxis.mul(tiltU.mul(relief))).add(acrossAxis.mul(tiltV.mul(relief)))
    this.normalNode = worldNormalToView(shading.normalize())
  }
}
