import {attribute, float, min, time, vec3} from 'three/tsl'
import {IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, MeshStandardNodeMaterial} from 'three/webgpu'

import fountain, {sheetLanding} from './config.ts'

type Droplet = {
  origin: [number, number, number]
  /** fraction of a full drop size */
  size: number
  /** height of the surface the droplet falls back into */
  until: number
  velocity: [number, number, number]
}

const goldenAngle = Math.PI * (3 - Math.sqrt(5))
const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1

/** The jet’s crown breaks into drops that rain back into the cup; where veils land, small splashes hop off the pools. */
export function fountainDroplets(count = fountain.sprayCount) {
  const {jet, gravity, pools, veils} = fountain
  const rise = jet.speed ** 2 / (2 * gravity)
  const crownSpeed = jet.speed * Math.sqrt(1 - jet.solid)
  const crown = Math.round(count * 0.5)
  const tazza = Math.round(count * 0.32)
  const droplets: Array<Droplet> = []
  for (let i = 0; i < count; i++) {
    const angle = i * goldenAngle
    const a = sequence(i, 0.13)
    const b = sequence(i * 7, 0.51)
    if (i < crown) {
      const spread = 0.05 + a * 0.22
      droplets.push({
        origin: [0, jet.y + rise * jet.solid, 0],
        velocity: [Math.cos(angle) * spread, crownSpeed * (0.55 + b * 0.6), Math.sin(angle) * spread],
        size: 1.2 + b * 0.6,
        until: pools.cup,
      })
      continue
    }
    const sheet = i < crown + tazza ? veils.tazza : veils.cup
    const radius = sheetLanding(sheet) + (b - 0.5) * 0.03
    const outward = 0.05 + a * 0.25
    const tangent = (b - 0.5) * 0.2
    droplets.push({
      origin: [Math.cos(angle) * radius, sheet.until, Math.sin(angle) * radius],
      velocity: [Math.cos(angle) * outward - Math.sin(angle) * tangent, 0.45 + a * 0.55, Math.sin(angle) * outward + Math.cos(angle) * tangent],
      size: 0.45 + b * 0.35,
      until: sheet.until,
    })
  }
  return droplets
}

/** Ballistic droplets animated entirely on the GPU; no per-frame allocations or React updates. */
export default class FountainSpray extends InstancedMesh<IcosahedronGeometry, MeshStandardNodeMaterial> {
  constructor(count = fountain.sprayCount) {
    const geometry = new IcosahedronGeometry(0.009, 0)
    const droplets = fountainDroplets(count)
    const origins = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const lifetimes = new Float32Array(count)
    const sizes = new Float32Array(count)
    for (const [i, {origin, velocity, size, until}] of droplets.entries()) {
      origins.set(origin, i * 3)
      velocities.set(velocity, i * 3)
      phases[i] = sequence(i * 3, 0.37)
      sizes[i] = size
      const up = velocity[1]
      lifetimes[i] = (up + Math.sqrt(up ** 2 + 2 * fountain.gravity * (origin[1] - until))) / fountain.gravity
    }
    geometry.setAttribute('sprayOrigin', new InstancedBufferAttribute(origins, 3))
    geometry.setAttribute('sprayVelocity', new InstancedBufferAttribute(velocities, 3))
    geometry.setAttribute('sprayPhase', new InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('sprayLifetime', new InstancedBufferAttribute(lifetimes, 1))
    geometry.setAttribute('spraySize', new InstancedBufferAttribute(sizes, 1))
    const material = new MeshStandardNodeMaterial({
      color: '#e4f4ef',
      roughness: 0.08,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
    const lifetime = attribute<'float'>('sprayLifetime', 'float')
    const progress = time.div(lifetime).add(attribute<'float'>('sprayPhase', 'float')).fract()
    const age = progress.mul(lifetime)
    // Drops grow out of the water and shrink as they rejoin it, so none of them pops.
    const scale = min(progress.mul(8), float(1).sub(progress).mul(8)).clamp(0, 1).mul(attribute<'float'>('spraySize', 'float'))
    material.positionNode = attribute<'vec3'>('position', 'vec3').mul(scale)
      .add(attribute<'vec3'>('sprayOrigin', 'vec3'))
      .add(attribute<'vec3'>('sprayVelocity', 'vec3').mul(age))
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
