import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, float, Fn, modelWorldMatrixInverse, negateOnBackSide, normalLocal, transformNormalToView, uv, vec2, vec3, vec4} from 'three/tsl'

import {loopPhase} from '../../candidates/claude_sonnet/lib/loopClock.ts'
import {knotArcLength, knotLength, tubeCircumference} from '../../candidates/claude_sonnet/lib/tubeCoordinates.ts'
import {knotFrame} from '../../lib/knotFrame.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import knotData from './data.ts'

/** Rings of spikes along the knot; even, so the half-step offset of a hexagonal packing closes around the loop. */
const bigRings = 60
const bigPerRing = 6
const fineRings = 180
const finePerRing = 18
const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
/** Nearest node of a hexagonally packed lattice on the tube, in physical units. `x` is the distance, `y` the ring index. */
function nearestSpike(tube: Node<'vec2'>, rings: number, perRing: number) {
  const along = knotArcLength(tube.x).mul(rings)
  const around = tube.y.mul(perRing)
  const ringPitch = knotLength / rings
  const columnPitch = tubeCircumference / perRing
  const base = along.round()
  let bestDistance: Node<'float'> = float(9)
  let bestRing: Node<'float'> = float(0)
  for (const offset of [-1, 0, 1]) {
    const ring = base.add(offset)
    const column = around.sub(ring.mod(2).mul(0.5))
    const dx = along.sub(ring).mul(ringPitch)
    const dy = column.sub(column.round()).mul(columnPitch)
    const distance = vec2(dx, dy).length()
    const better = distance.lessThan(bestDistance)
    bestDistance = better.select(distance, bestDistance)
    bestRing = better.select(ring, bestRing)
  }
  return {
    distance: bestDistance,
    ring: bestRing,
    radius: columnPitch * 0.6,
  }
}
/** The ferrofluid surface: a conical spike per lattice node, rising with the magnet's pull – the visitor is the magnet – and leaning toward it. `micro` adds a finer forest that only the shading normal sees. */
const ferrofluid = Fn(([tube, micro, magnet]: [Node<'vec2'>, Node<'float'>, Node<'vec3'>]) => {
  const {position: base, normal} = knotFrame(tube)
  const toMagnet = magnet.sub(base)
  const pull = toMagnet.length().smoothstep(0.95, 4).oneMinus()
  const direction = toMagnet.normalize()
  const facing = direction.dot(normal)
  const lean = direction.sub(normal.mul(facing)).mul(facing.smoothstep(-0.3, 0.4)).mul(0.55)
  const spike = nearestSpike(tube, bigRings, bigPerRing)
  const pulse = loopPhase.add(spike.ring.mul(TAU * 2 / bigRings)).sin().mul(0.13).add(0.87)
  const profile = spike.distance.div(spike.radius).clamp(0, 1).oneMinus().pow(1.7)
  const height = profile.mul(pull.pow(1.2).mul(0.066).add(0.012)).mul(pulse)
  const fine = nearestSpike(tube, fineRings, finePerRing)
  const fineHeight = fine.distance.div(fine.radius).clamp(0, 1).oneMinus().pow(1.5).mul(pull.pow(2).mul(0.0085)).mul(micro)
  return base.add(normal.mul(height.add(fineHeight))).add(lean.mul(height))
})
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.15)
    this.name = knotData.id
    const tube = uv()
    this.positionNode = ferrofluid(tube, float(0), cameraLocal)
    const stepU = 3e-4
    const stepV = 2.5e-3
    const du = ferrofluid(tube.add(vec2(stepU, 0)), float(1), cameraLocal).sub(ferrofluid(tube.sub(vec2(stepU, 0)), float(1), cameraLocal))
    const dv = ferrofluid(tube.add(vec2(0, stepV)), float(1), cameraLocal).sub(ferrofluid(tube.sub(vec2(0, stepV)), float(1), cameraLocal))
    const raw = du.cross(dv)
    const outward = raw.mul(raw.dot(normalLocal).sign()).normalize()
    this.normalNode = negateOnBackSide(transformNormalToView(outward))
    this.colorNode = vec3(0.13, 0.135, 0.16)
    this.metalness = 1
    this.roughness = 0.05
    this.iridescence = 0.35
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessRange = [320, 620]
  }
}
