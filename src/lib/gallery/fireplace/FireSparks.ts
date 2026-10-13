import {attribute, float, hash, min, time, vec3} from 'three/tsl'
import {AdditiveBlending, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, MeshBasicNodeMaterial} from 'three/webgpu'

import fireColor from '../../materials/fireColor.ts'
import fire from './config.ts'

type Spark = {
  /** seconds from birth until it burns out */
  lifetime: number
  /** where the spark leaves the fire, in the fire frame */
  origin: [number, number, number]
  /** rising speed in m/s */
  speed: number
  /** sideways meander amplitude in meters */
  wander: number
}

const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1

/** Sparks rise from the whole width of the fire and burn out before they reach the lintel. */
export function fireSparks(count = fire.sparks.count) {
  const sparks: Array<Spark> = []
  for (let i = 0; i < count; i++) {
    const a = sequence(i, 0.17)
    const b = sequence(i * 7, 0.53)
    const c = sequence(i * 13, 0.71)
    const y = fire.flames.gapY + 0.1 + c * 0.15
    const speed = 0.45 + b * 0.55
    sparks.push({
      origin: [(a * 2 - 1) * fire.flames.spread, y, (c - 0.5) * 0.2],
      speed,
      lifetime: Math.min(0.9 + a * 1.1, (fire.sparks.maximumHeight - y) / speed),
      wander: 0.03 + c * 0.05,
    })
  }
  return sparks
}

/**
 * Glowing sparks animated entirely on the GPU, like the fountain spray.
 *
 * Each spark loops over its lifetime with its own phase, but only flies in about every other loop, so the pattern never visibly repeats. It meanders upward in the draft and cools from yellow to dull red while it shrinks away.
 */
export default class FireSparks extends InstancedMesh<IcosahedronGeometry, MeshBasicNodeMaterial> {
  constructor(count = fire.sparks.count) {
    const geometry = new IcosahedronGeometry(0.008, 0)
    const sparks = fireSparks(count)
    const origins = new Float32Array(count * 3)
    const motion = new Float32Array(count * 4)
    for (const [i, {origin, speed, lifetime, wander}] of sparks.entries()) {
      origins.set(origin, i * 3)
      motion.set([speed, lifetime, wander, sequence(i * 3, 0.29)], i * 4)
    }
    geometry.setAttribute('sparkOrigin', new InstancedBufferAttribute(origins, 3))
    // speed, lifetime, wander, phase
    geometry.setAttribute('sparkMotion', new InstancedBufferAttribute(motion, 4))
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    })
    material.name = 'lodge-spark'
    const parameters = attribute<'vec4'>('sparkMotion', 'vec4')
    const speed = parameters.x
    const lifetime = parameters.y
    const wander = parameters.z
    const cycle = time.div(lifetime).add(parameters.w)
    const progress = cycle.fract()
    const age = progress.mul(lifetime)
    const live = hash(cycle.floor().add(parameters.w.mul(97))).lessThan(0.5).select(float(1), float(0))
    const heat = progress.oneMinus().mul(0.75).add(0.25)
    const scale = min(progress.mul(12), float(1)).mul(progress.oneMinus().pow(0.6)).mul(live)
    const meander = vec3(age.mul(5.1).add(parameters.w.mul(40)).sin(), 0, age.mul(3.7).add(parameters.w.mul(23)).cos()).mul(wander).mul(age)
    material.positionNode = attribute<'vec3'>('position', 'vec3').mul(scale)
      .add(attribute<'vec3'>('sparkOrigin', 'vec3'))
      .add(vec3(0, speed.mul(age), 0))
      .add(meander)
    material.colorNode = fireColor(heat).mul(6)
    super(geometry, material, count)
    this.name = 'lodge-sparks'
    // Vertex animation exceeds the source spark’s bounds.
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
