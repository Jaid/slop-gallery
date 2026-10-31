import {attribute, cameraWorldMatrix, cos, cross, exp, float, max, mix, positionGeometry, select, sin, smoothstep, uniform, uv, vec3, vec4} from 'three/tsl'
import {AdditiveBlending, Color, InstancedBufferAttribute, InstancedMesh, MeshBasicNodeMaterial, PlaneGeometry} from 'three/webgpu'

import {TransparentSpriteOutputsNode} from '../../rendering/GalleryRenderPipeline.ts'

/** how many sparks spiral into the portal at a time */
const inflowing = 160
/** how many sparks a burst flings out */
const bursting = 220
const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1

/**
 * Glowing sparks around a fusion’s portal, animated entirely on the GPU like the fire’s: a steady stream spiraling into the disc from every side, and a burst flung out in every direction when the result flips out or the portal fizzles.
 * Positions are relative to the portal’s middle, which the mesh’s group stands at.
 */
export default class PortalSparks extends InstancedMesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    /** seconds since the last burst; long ago hides it */
    burst: uniform(10),
    /** how bright the burst is */
    burstStrength: uniform(1),
    clock: uniform(0),
    /** how many of the inflowing sparks glow, 0–1 and beyond */
    energy: uniform(0),
    /** the portal disc’s radius in meters */
    radius: uniform(0),
    rim: uniform(new Color),
    swirl: uniform(new Color),
  }

  constructor() {
    const count = inflowing + bursting
    const geometry = new PlaneGeometry(1, 1)
    const seeds = new Float32Array(count * 4)
    const axes = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      seeds.set([sequence(i, 0.13), sequence(i * 7, 0.41), sequence(i * 13, 0.71), sequence(i * 3, 0.29)], i * 4)
      // Fibonacci sphere: inflowing sparks orbit planes with these normals, bursting ones fly along them.
      const index = i < inflowing ? i : i - inflowing
      const total = i < inflowing ? inflowing : bursting
      const y = 1 - (index + 0.5) / total * 2
      const ring = Math.sqrt(1 - y * y)
      const turn = index * Math.PI * (3 - Math.sqrt(5))
      axes.set([Math.cos(turn) * ring, y, Math.sin(turn) * ring], i * 3)
    }
    // The first instances flow in, the rest burst.
    const kinds = new Float32Array(count)
    kinds.fill(1, inflowing)
    geometry.setAttribute('sparkSeed', new InstancedBufferAttribute(seeds, 4))
    geometry.setAttribute('sparkAxis', new InstancedBufferAttribute(axes, 3))
    geometry.setAttribute('sparkBurst', new InstancedBufferAttribute(kinds, 1))
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    material.blending = AdditiveBlending
    material.name = 'fusion-sparks'
    material.mrtNode = new TransparentSpriteOutputsNode
    super(geometry, material, count)
    this.name = 'fusion-sparks'
    const {burst, burstStrength, clock, energy, radius, rim, swirl} = this.uniforms
    const seed = attribute<'vec4'>('sparkSeed', 'vec4')
    const axis = attribute<'vec3'>('sparkAxis', 'vec3')
    // Inflowing: each spark spirals from up to three radii out into the disc over its own lifetime, again and again.
    const lifetime = seed.x.mul(1.1).add(0.9)
    const progress = clock.div(lifetime).add(seed.y).fract()
    const distance = seed.z.mul(1.9).add(1.15).mul(float(1).sub(progress).pow(1.4)).add(0.15).mul(radius)
    const spin = seed.y.mul(Math.PI * 2).add(progress.mul(seed.w.mul(6).add(4)))
    const first = cross(axis, vec3(0.31, 0.95, 0.07)).normalize()
    const second = cross(axis, first)
    const inflow = first.mul(cos(spin)).add(second.mul(sin(spin))).mul(distance)
    const inflowGlow = smoothstep(0, 0.12, progress).mul(smoothstep(1, 0.75, progress)).mul(energy)
    const inflowSize = seed.x.mul(0.02).add(0.012).mul(progress.mul(0.6).add(0.6))
    // Bursting: flung out along the axis, slowed by drag and pulled down a little, fading out one after another.
    const age = burst.sub(seed.w.mul(0.08))
    const speed = seed.x.mul(5).add(2)
    const outflow = axis.mul(speed.mul(float(1).sub(exp(age.mul(-2.4)))).div(2.4)).add(vec3(0, age.mul(age).mul(-0.6), 0))
    const fading = float(1).sub(age.div(seed.y.mul(0.8).add(0.9))).clamp(0, 1)
    const burstGlow = select(age.greaterThan(0), fading.mul(fading), float(0)).mul(burstStrength)
    const burstSize = seed.z.mul(0.02).add(0.014)
    const isBurst = attribute<'float'>('sparkBurst', 'float').greaterThan(0.5)
    const center = select(isBurst, outflow, inflow)
    const size = select(isBurst, burstSize, inflowSize)
    const right = cameraWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz
    const upward = cameraWorldMatrix.mul(vec4(0, 1, 0, 0)).xyz
    material.positionNode = right.mul(positionGeometry.x).add(upward.mul(positionGeometry.y)).mul(size).add(center)
    const glow = select(isBurst, burstGlow.mul(4), inflowGlow.mul(3))
    material.colorNode = mix(swirl, rim, select(isBurst, seed.y, seed.z)).mul(glow)
    const disc = max(float(1).sub(uv().sub(0.5).length().mul(2)), 0)
    material.opacityNode = disc.mul(disc)
    // The vertex shader places every spark, so the source quad’s bounds say nothing.
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
