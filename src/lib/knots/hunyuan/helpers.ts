import {cameraPosition, modelWorldMatrixInverse, normalViewGeometry, positionGeometry, positionView, positionViewDirection, vec4} from 'three/tsl'

export default function viewerFrame() {
  const p = positionGeometry
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const view = cameraLocal.sub(p).normalize()
  const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
  const grazing = facing.oneMinus()
  const distance = positionView.length()
  return {
    p,
    cameraLocal,
    view,
    facing,
    grazing,
    rim: grazing.abs().pow(2),
    distance,
    near: distance.smoothstep(1.25, 5.5).oneMinus(),
    intimate: distance.smoothstep(0.8, 2.7).oneMinus(),
  }
}

export {default as cellNoiseVec3} from '../cellNoise.ts'
export {liquidNormal, opticalLine, proceduralNormal, spectralColor} from '../shared.ts'
