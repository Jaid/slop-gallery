import {cameraPosition, modelWorldMatrixInverse, positionGeometry, vec4} from 'three/tsl'

export function premiumView() {
  return modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz.sub(positionGeometry).normalize()
}
