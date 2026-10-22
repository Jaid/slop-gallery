import type {Node} from 'three/webgpu'

import {atan, color, cos, float, fwidth, length, max, mix, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_vec2, normalGeometry, positionGeometry, smoothstep, time, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import fountain from '../gallery/fountain/config.ts'
import {visibleDetail} from './filters.ts'

type Float = Node<'float'>

const below = (value: Float, edge: Float | number, softness = 0.003) => {
  const at = typeof edge === 'number' ? float(edge) : edge
  return float(1).sub(smoothstep(at.sub(softness), at.add(softness), value))
}
const unit = (node: Float) => node.mul(0.5).add(0.5)

/**
 * The fountain’s honed white statuary marble.
 *
 * A warm ivory body clouded in soft gray, crossed by sparse, thin gray veins that wander through the block in three dimensions, so they continue
 * around every molding and lobe like real carved stone. Veins finer than a pixel fade into the body.
 *
 * Whatever lies under the water of a pool is darker, glossier and lit by shifting caustics, the light the rippling surface focuses onto it.
 */
export default class FountainStoneMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({roughness: 0.34})
    this.name = 'fountain-marble'
    const {basin, cup, pools, tazza} = fountain
    const p = positionGeometry
    // Domain-warped, so the veins fold and flow instead of following straight noise contours.
    const warp = vec3(
      mx_noise_float(p.mul(0.8)),
      mx_noise_float(p.mul(0.8).add(5.2)),
      mx_noise_float(p.mul(0.8).add(9.7)),
    ).mul(0.7)
    const q = p.add(warp).toVar('marbleBlock')
    const clouds = unit(mx_fractal_noise_float(q.mul(2.2), 4, 2, 0.5)).smoothstep(0.25, 0.85)
    // Stretched along a diagonal bedding plane, so veins run as long drifts through the block rather than closing into rings.
    const bedding = q.x.mul(0.8).add(q.y.mul(1.9)).add(q.z.mul(0.5))
    const course = mx_noise_float(vec3(bedding.mul(1.4), q.x.mul(0.45).sub(q.z.mul(0.3)), q.z.mul(0.45)))
    const veinWidth = max(fwidth(course).mul(1.1), float(0.01))
    // Each vein swells and fades along its course and is missing in places.
    const presence = unit(mx_noise_float(q.mul(1.6).add(3.3))).smoothstep(0.35, 0.75)
    const veins = float(1).sub(smoothstep(0, veinWidth, course.abs())).mul(presence)
    const footprint = max(fwidth(p.x), fwidth(p.y))
    const threads = float(1).sub(smoothstep(0, max(fwidth(mx_noise_float(q.mul(5).add(8))).mul(1.2), float(0.006)), mx_noise_float(q.mul(5).add(8)).abs()))
      .mul(unit(mx_noise_float(q.mul(3).add(13))).smoothstep(0.55, 0.85)).mul(visibleDetail(footprint, 0.02))
    let stone: Node<'vec3'> = mix(color('#efe9dd'), color('#d6cdbd'), clouds.mul(0.7))
    stone = mix(stone, color('#aaa497'), threads.mul(0.35))
    stone = mix(stone, color('#958f85'), veins.mul(0.55))
    // Wet stone: everything under a pool’s surface.
    const radius = length(p.xz)
    const angle = atan(p.z, p.x)
    const basinWall = cos(angle.mul(fountain.lobes)).mul(basin.lobe).add(basin.radius)
    const facingUp = smoothstep(-0.1, 0.25, normalGeometry.y)
    // Lapping water keeps a band just above each waterline wet too, fading over a few centimeters.
    const splashed = (y: number) => float(1).sub(smoothstep(y + 0.004, y + 0.035, p.y)).mul(0.6).max(below(p.y, y))
    const wet = max(
      below(p.y, pools.basin).mul(below(radius, basinWall.add(0.006))).max(splashed(pools.basin).mul(below(radius, basinWall.add(0.006))).mul(below(p.y, basin.rimTop - 0.02))),
      max(
        splashed(pools.tazza).mul(below(radius, float(tazza.innerRadius + 0.005))).mul(smoothstep(1.46, 1.47, p.y)),
        splashed(pools.cup).mul(below(radius, float(cup.innerRadius + 0.005))).mul(smoothstep(2.29, 2.3, p.y)),
      ).mul(facingUp.max(below(radius, 0.2, 0.01))),
    ).toVar('fountainWet')
    // Caustics: the bright, wandering web where the ripples focus the light, two layers drifting against each other.
    const causticLayer = (scale: number, speed: number, offset: number) => {
      const cells = mx_worley_noise_vec2(vec3(p.x.mul(scale).add(offset), p.z.mul(scale), time.mul(speed).add(offset)), 1)
      return float(1).sub(smoothstep(0, 0.09, cells.y.sub(cells.x)))
    }
    // Where two layers cross, the light is focused hardest; elsewhere a single layer glimmers faintly. Broad patches dim and brighten as the surface swells.
    const patches = unit(mx_noise_float(vec3(p.x.mul(1.3), p.z.mul(1.3), time.mul(0.25)))).smoothstep(0.2, 0.8)
    const caustics = causticLayer(5.5, 0.5, 0).mul(causticLayer(8, 0.65, 3.1)).add(causticLayer(5.5, 0.5, 0).mul(0.2)).mul(patches.mul(0.8).add(0.2))
      .mul(visibleDetail(footprint, 0.06)).mul(wet).mul(smoothstep(-0.3, 0.6, normalGeometry.y))
    this.colorNode = stone.mul(mix(float(1), float(0.62), wet)).mul(caustics.mul(0.7).add(1))
    const grain = mx_noise_float(p.mul(140))
    this.roughnessNode = mix(grain.mul(0.04).add(0.34).sub(veins.mul(0.06)), float(0.12), wet)
  }
}
