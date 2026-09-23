import type {Node} from 'three/webgpu'

import {bitangentView, float, normalViewGeometry, positionViewDirection, tangentView, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {studioLightsView} from './studioLights.ts'

/**
 * Faceted micro-glitter: a jittered lattice of crystal facets whose random tilt either catches one
 * of the studio lamps or stays dark. `facet` drives the shading normal, `sparkle` is the highlight
 * count, and both dissolve back into the plain surface once the lattice drops below a pixel, so
 * sand, frost and crushed mirror sparkle without ever aliasing.
 */
export function glitter(position: Node<'vec3'>, cellSize: number, sharpness: number, tilt = 0.55) {
  const q = position.div(cellSize)
  const cell = q.floor()
  const rnd = cellNoiseVec3(cell)
  const lean = tangentView.mul(rnd.x.mul(2).sub(1)).add(vec3(bitangentView as unknown as Node<'vec3'>).mul(rnd.y.mul(2).sub(1))).mul(tilt)
  const resolved = q.fwidth().length().smoothstep(0.32, 1.15).oneMinus()
  const facet = normalViewGeometry.add(lean.mul(resolved)).normalize()
  let sparkle: Node<'float'> = float(0)
  for (const lamp of studioLightsView) {
    const half = lamp.add(positionViewDirection).normalize()
    sparkle = sparkle.add(facet.dot(half).clamp().pow(sharpness))
  }
  return {
    facet,
    lean: lean.mul(resolved),
    resolved,
    sparkle: sparkle.mul(resolved),
  }
}
