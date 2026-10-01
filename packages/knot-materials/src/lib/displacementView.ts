import {modelViewMatrix, normalViewGeometry, positionGeometry, vec4} from 'three/tsl'

/** Camera response from the undeformed surface, without caching positionView before positionNode finishes. */
export function displacementView() {
  const viewPosition = modelViewMatrix.mul(vec4(positionGeometry, 1)).xyz
  const distance = viewPosition.length()
  const facing = normalViewGeometry.dot(viewPosition.negate().normalize()).abs().clamp()
  return {
    distance,
    facing,
    grazing: facing.oneMinus(),
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}
