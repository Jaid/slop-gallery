import type {Node} from 'three/webgpu'

import {vec3} from 'three/tsl'

/**
 * Development aid: when `KNOT_DEBUG_LAYER` names one of the given layers, the material shows only that layer as flat
 * emission (no lighting, no other terms) so it can be judged in isolation. Otherwise the normal composition is returned.
 *
 * The preview script forwards the variable to the browser; the shipped game never sets it, so this is a no-op there.
 */
export function debugLayer<Name extends string>(layers: Record<Name, Node<'float'> | Node<'vec3'>>, compose: () => Node<'vec3'>): {
  emissive: Node<'vec3'>
  isolated: boolean
} {
  const selected = (globalThis as {KNOT_DEBUG_LAYER?: string}).KNOT_DEBUG_LAYER
  if (selected && selected in layers) {
    const layer = layers[selected as Name] as Node<'vec3'>
    return {
      emissive: vec3(layer),
      isolated: true,
    }
  }
  return {
    emissive: compose(),
    isolated: false,
  }
}
