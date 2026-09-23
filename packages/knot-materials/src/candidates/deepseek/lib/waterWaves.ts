import type {Node} from 'three/webgpu'

import {float, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

export type WaterTrain = {
  amplitude: Node<'float'> | number
  direction: [number, number, number]
  speed: number
  wavelength: number
}
/**
 * Crossing wave trains over an object-space position, with analytic slopes so the surface normal is
 * exact instead of a derivative estimate. `height` drives crest masks, `slope` the shading normal.
 */
export function waterWaves(position: Node<'vec3'>, clock: Node<'float'>, trains: Array<WaterTrain>) {
  let height: Node<'float'> = float(0)
  let slope: Node<'vec3'> = vec3(0)
  for (const train of trains) {
    const direction = vec3(...train.direction).normalize()
    const waveNumber = TAU / train.wavelength
    const amplitude = typeof train.amplitude === 'number' ? float(train.amplitude) : train.amplitude
    const phase = position.dot(direction).mul(waveNumber).add(clock.mul(train.speed))
    height = height.add(phase.sin().mul(amplitude))
    slope = slope.add(direction.mul(phase.cos()).mul(waveNumber).mul(amplitude))
  }
  return {
    height,
    slope,
  }
}
