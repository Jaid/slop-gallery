import type {Node} from 'three/webgpu'

/** The object-space point seen at `depth` below the surface, following the view ray refracted by Snell's law. Unlike a raw `p - view·depth` offset, the lateral shift stays bounded at grazing angles (no smeared needles), and the sample really lies deeper inside the tube. */
export function refractedParallax(position: Node<'vec3'>, normal: Node<'vec3'>, view: Node<'vec3'>, depth: Node<'float'> | number, ior: number) {
  const cosIncident = normal.dot(view).clamp(0, 1)
  const lateral = view.sub(normal.mul(cosIncident))
  const sinSq = lateral.dot(lateral).div(ior * ior)
  const cosRefracted = sinSq.oneMinus().max(0.05).sqrt()
  const offset = lateral.div(ior).div(cosRefracted)
  return position.sub(normal.add(offset).mul(depth))
}
