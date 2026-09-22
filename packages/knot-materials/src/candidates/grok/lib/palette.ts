import type {Node} from 'three/webgpu'

import {color, float, mix, vec3} from 'three/tsl'

const channels = (hex: string) => vec3(color(hex).r, color(hex).g, color(hex).b)

type Stop = {
  at: number
  hex: string
}
/**
 * Piecewise-linear palette. Stops must be strictly increasing. Values outside the first and last stop clamp to those ends.
 */
export function palette(t: Node<'float'>, stops: ReadonlyArray<Stop>): Node<'vec3'> {
  if (stops.length < 2) {
    throw new RangeError('A palette needs at least two stops.')
  }
  let result: Node<'vec3'> = channels(stops.at(-1)!.hex)
  for (let index = stops.length - 2;index >= 0;index--) {
    const current = stops[index]
    const next = stops[index + 1]
    const span = next.at - current.at
    if (!(span > 0)) {
      throw new RangeError('Palette stops must be strictly increasing.')
    }
    const local = t.sub(current.at).div(span).clamp()
    const segment = mix(channels(current.hex), channels(next.hex), local)
    result = vec3(t.lessThan(float(next.at)).select(segment, result))
  }
  return result
}
