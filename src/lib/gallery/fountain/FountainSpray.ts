import {attribute, float, min, normalize, time, vec3} from 'three/tsl'
import {IcosahedronGeometry, InstancedInterleavedBuffer, InstancedMesh, InterleavedBufferAttribute, MeshStandardNodeMaterial} from 'three/webgpu'

import fountain, {arcVelocity, jetAngle, ribbonSheet, sheetFlightTime, sheetLanding, spoutAngle} from './config.ts'

type Droplet = {
  origin: [number, number, number]
  /** fraction of a full drop size */
  size: number
  /** height of the surface the droplet falls back into */
  until: number
  velocity: [number, number, number]
}

/** floats per drop in the interleaved instance buffer */
const stride = 9
const goldenAngle = Math.PI * (3 - Math.sqrt(5))
const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1
/** how many droplets each source gets, as shares of the total */
const shares = {
  crown: 0.36,
  ribbons: 0.3,
  arcs: 0.22,
  veil: 0.12,
} as const
/**
 * Every droplet of the fountain, in its local space.
 *
 * The crown jet breaks into drops that rain back into the cup; where the ribbons and arcing jets land in the basin and the veil lands in the tazza,
 * splashes hop off the water, faster where the water fell farther.
 */
export function fountainDroplets(count = fountain.sprayCount) {
  const {jet, gravity, pools, veil, arc} = fountain
  const rise = jet.speed ** 2 / (2 * gravity)
  const crownSpeed = jet.speed * Math.sqrt(1 - jet.solid)
  const crown = Math.round(count * shares.crown)
  const ribbons = Math.round(count * shares.ribbons)
  const arcs = Math.round(count * shares.arcs)
  const ribbonLanding = sheetLanding(ribbonSheet)
  const ribbonImpact = gravity * sheetFlightTime(ribbonSheet)
  const arcImpact = Math.abs(arcVelocity(arc)[1] - gravity * arc.duration)
  const veilLanding = sheetLanding(veil)
  const droplets: Array<Droplet> = []
  for (let i = 0; i < count; i++) {
    const angle = i * goldenAngle
    const a = sequence(i, 0.13)
    const b = sequence(i * 7, 0.51)
    if (i < crown) {
      // The crown opens like a dandelion: a few drops fly wide, most fall close around the jet.
      const spread = 0.04 + a ** 1.5 * 0.26
      droplets.push({
        origin: [0, jet.y + rise * jet.solid, 0],
        velocity: [Math.cos(angle) * spread, crownSpeed * (0.5 + b * 0.7), Math.sin(angle) * spread],
        size: 0.9 + b * 0.7,
        until: pools.cup,
      })
    } else if (i < crown + ribbons) {
      const source = (i - crown) % fountain.spouts
      const at = spoutAngle(source)
      droplets.push(splash(i, [Math.cos(at) * ribbonLanding, Math.sin(at) * ribbonLanding], 0.07, pools.basin, ribbonImpact * 0.32, 0.8))
    } else if (i < crown + ribbons + arcs) {
      const source = (i - crown - ribbons) % fountain.lobes
      const at = jetAngle(source)
      droplets.push(splash(i, [Math.cos(at) * arc.to[0], Math.sin(at) * arc.to[0]], 0.03, pools.basin, arcImpact * 0.25, 0.55))
    } else {
      // Splashes all along the ring where the veil meets the tazza.
      const radius = veilLanding + (b - 0.5) * 0.02
      const outward = 0.05 + a * 0.22
      droplets.push({
        origin: [Math.cos(angle) * radius, pools.tazza, Math.sin(angle) * radius],
        velocity: [Math.cos(angle) * outward, 0.35 + a * 0.5, Math.sin(angle) * outward],
        size: 0.45 + b * 0.3,
        until: pools.tazza,
      })
    }
  }
  return droplets
}

/** A splash hopping off a pool where falling water lands: mostly up, scattered around, faster for harder landings. */
function splash(i: number, center: readonly [number, number], spread: number, until: number, speed: number, size: number): Droplet {
  const a = sequence(i, 0.13)
  const b = sequence(i * 7, 0.51)
  const c = sequence(i * 13, 0.29)
  const direction = c * 2 * Math.PI
  const radius = spread * Math.sqrt(a)
  const outward = (0.15 + b * 0.55) * speed
  return {
    origin: [center[0] + Math.cos(direction) * radius, until, center[1] + Math.sin(direction) * radius],
    velocity: [Math.cos(direction) * outward * 0.45, (0.35 + a * 0.65) * speed, Math.sin(direction) * outward * 0.45],
    size: size * (0.5 + b * 0.6),
    until,
  }
}

/**
 * Ballistic droplets animated entirely on the GPU; no per-frame allocations or React updates.
 *
 * Each drop is drawn stretched along its velocity by the distance it travels in about a frame, so fast drops read as the short streaks the eye
 * sees instead of beads. Drops grow out of the water and shrink as they rejoin it, so none of them pops.
 */
export default class FountainSpray extends InstancedMesh<IcosahedronGeometry, MeshStandardNodeMaterial> {
  constructor(count = fountain.sprayCount) {
    const geometry = new IcosahedronGeometry(0.006, 0)
    // Shading needs no UVs. Every buffer counts against WebGPU’s limit of eight per pipeline, which motion vectors already strain.
    geometry.deleteAttribute('uv')
    const droplets = fountainDroplets(count)
    // One interleaved buffer per drop: origin, phase, launch velocity, lifetime and size.
    const data = new Float32Array(count * stride)
    for (const [i, {origin, velocity, size, until}] of droplets.entries()) {
      const up = velocity[1]
      const lifetime = (up + Math.sqrt(up ** 2 + 2 * fountain.gravity * (origin[1] - until))) / fountain.gravity
      data.set([...origin, sequence(i * 3, 0.37), ...velocity, lifetime, size], i * stride)
    }
    const buffer = new InstancedInterleavedBuffer(data, stride)
    geometry.setAttribute('sprayOrigin', new InterleavedBufferAttribute(buffer, 3, 0))
    geometry.setAttribute('sprayPhase', new InterleavedBufferAttribute(buffer, 1, 3))
    geometry.setAttribute('sprayVelocity', new InterleavedBufferAttribute(buffer, 3, 4))
    geometry.setAttribute('sprayLifetime', new InterleavedBufferAttribute(buffer, 1, 7))
    geometry.setAttribute('spraySize', new InterleavedBufferAttribute(buffer, 1, 8))
    const material = new MeshStandardNodeMaterial({
      color: '#eef7f5',
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    })
    material.name = 'fountain-spray'
    const lifetime = attribute<'float'>('sprayLifetime', 'float')
    const progress = time.div(lifetime).add(attribute<'float'>('sprayPhase', 'float')).fract()
    const age = progress.mul(lifetime)
    const launch = attribute<'vec3'>('sprayVelocity', 'vec3')
    const velocity = launch.add(vec3(0, -fountain.gravity, 0).mul(age))
    const scale = min(progress.mul(10), float(1).sub(progress).mul(10)).clamp(0, 1).mul(attribute<'float'>('spraySize', 'float'))
    const local = attribute<'vec3'>('position', 'vec3').mul(scale)
    // Stretched along the motion by the distance covered in about 1/60 s, relative to the drop’s own size.
    const direction = normalize(velocity.add(vec3(0, 1e-4, 0)))
    const stretch = velocity.length().mul(1 / 60).div(float(0.015).mul(scale).max(1e-4)).clamp(0, 6)
    material.positionNode = local.add(direction.mul(local.dot(direction)).mul(stretch))
      .add(attribute<'vec3'>('sprayOrigin', 'vec3'))
      .add(launch.mul(age))
      .add(vec3(0, -fountain.gravity / 2, 0).mul(age.pow(2)))
    super(geometry, material, count)
    this.name = 'fountain-spray'
    // Vertex animation exceeds the source drop’s bounds.
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
