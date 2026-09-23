import type {Node} from 'three/webgpu'

import {time, vec3} from 'three/tsl'

/**
 * The exhibition's animated angle loop covers exactly two seconds, so every motion in a material
 * must close on that period to loop without a jump. `loopPhase` turns once per loop; harmonics
 * built from it, and noise sampled along a `loopDrift` circle, stay seamless.
 */
export const loopSeconds = 2
export const loopPhase = time.mul(Math.PI)
/** A sine harmonic: `cycles` full revolutions per loop, `phase` offset in radians. */
export function loopWave(cycles: number, phase: Node<'float'> | number = 0) {
  return loopPhase.mul(cycles).add(phase).sin()
}
/** The same harmonic mapped to 0..1. */
export function loopOsc(cycles: number, phase: Node<'float'> | number = 0) {
  return loopWave(cycles, phase).mul(0.5).add(0.5)
}
/** Sample noise along a closed circular path so drifting detail is back home after one loop. */
export function loopDrift(position: Node<'vec3'>, radius: Node<'float'> | number, cycles = 1) {
  return position.add(vec3(loopPhase.mul(cycles).cos(), loopPhase.mul(cycles).sin(), 0).mul(radius))
}
/** A phase that walks the loop once, for cyclic coordinate systems such as a writing head. */
export const loopTurn = loopPhase.div(Math.PI * 2)
