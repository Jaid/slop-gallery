import type {Node} from 'three/webgpu'

/** Floored modulo into [0, period). WGSL’s float `%` truncates toward zero, so `mod` keeps the sign of negative inputs. */
export function wrap(value: Node<'float'>, period: Node<'float'> | number) {
  return value.sub(value.div(period).floor().mul(period))
}
/** Signed shortest offset on a circle of the given period, in [−period/2, period/2). */
export function wrapCentered(value: Node<'float'>, period: number) {
  return wrap(value.add(period / 2), period).sub(period / 2)
}
