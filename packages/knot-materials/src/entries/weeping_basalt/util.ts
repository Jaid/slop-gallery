import type {Node} from 'three/webgpu'

export function pulse01(value: Node<'float'>, centre: number, width: number) {
  const footprint = value.fwidth().max(0.0001)
  return value
    .sub(centre)
    .abs()
    .smoothstep(width, footprint.mul(1.25).add(width))
    .oneMinus()
}
