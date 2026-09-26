import type {Node} from 'three/webgpu'

import {float} from 'three/tsl'

/**
 * 1 where `value < edge`, else 0 – e.g. `below(random, 0.2)` keeps 20% of cells.
 * Clearer than TSL's method-chained `value.step(edge)`, which means the opposite: `step(edge, value)`, i.e. `value ≥ edge`.
 */
export function below(value: Node<'float'>, edge: Node<'float'> | number) {
  return value.lessThan(edge).select(float(1), float(0))
}
