import type {Node} from 'three/webgpu'

import {
  cos,
  Fn,
  sin,
} from 'three/tsl'

import {knotFrame} from '../../lib/knotFrame.ts'
import {TAU} from '../../lib/TAU.ts'

/**
 * Geometric hopper crystal displacement:
 * Aggressively sculpts the knot tube into orthogonal square hopper staircases
 * with planar cleavage cuts into the core.
 */
export const bismuthHopperShape = Fn(([tube]: [Node<'vec2'>]) => {
  const {position: p, normal} = knotFrame(tube)
  // 4-fold square prism cross-section: strictly planar facets
  const theta = tube.y.mul(TAU)
  const cosT = cos(theta).abs()
  const sinT = sin(theta).abs()
  const squareMetric = cosT.max(sinT).max(0.15)
  // Expand cross section from circle into sharp square prism
  const squareExpansion = squareMetric.reciprocal().sub(1).mul(0.055)
  // Stepped hopper terraces along the knot tube
  const uTiers = tube.x.mul(32)
  const uLocal = uTiers.fract().sub(0.5).abs().mul(2)
  const vTiers = tube.y.mul(8)
  const vLocal = vTiers.fract().sub(0.5).abs().mul(2)
  const hopperDist = uLocal.max(vLocal)
  // Rigid stair-step profile: quantized 90-degree steps
  const steps = 6
  const steppedLedge = hopperDist.mul(steps).floor().div(steps).mul(0.035)
  // Planar cleavage cuts along 45-degree and 90-degree lattice planes
  const planeA = tube.x.mul(16).add(tube.y.mul(8)).fract().sub(0.5).abs()
  const planeB = tube.x.mul(16).sub(tube.y.mul(8)).fract().sub(0.5).abs()
  const cleavagePlane = planeA.min(planeB)
  const deepChasm = cleavagePlane.smoothstep(0.015, 0.08).oneMinus().mul(-0.048)
  const totalDisplacement = squareExpansion.add(steppedLedge).add(deepChasm)
  return p.add(normal.mul(totalDisplacement))
})
