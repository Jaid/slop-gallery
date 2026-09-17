import type {Node} from 'three/webgpu'

export function bell(value: Node<'float'>, centre: number, sharpness: number) {
  const d = value.sub(centre)
  return d.mul(d).mul(-sharpness).exp()
}
