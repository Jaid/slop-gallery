import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, CatmullRomCurve3, SphereGeometry, TubeGeometry, Vector3} from 'three/webgpu'

/** A small hammered-iron plate with two peened nails and a curved, upturned hook. The plate backs onto the fireplace stone; -z reaches into the Lodge. */
export default function createLodgeHatchetHookGeometry() {
  const plate = new BoxGeometry(0.075, 0.15, 0.026)
  const curve = new CatmullRomCurve3([
    new Vector3(0, -0.023, -0.016),
    new Vector3(0, -0.025, -0.07),
    new Vector3(0, -0.06, -0.13),
    new Vector3(0, -0.043, -0.177),
    new Vector3(0, 0.026, -0.205),
  ])
  const arm = new TubeGeometry(curve, 28, 0.016, 8, false)
  const rivets = [-0.05, 0.05].map(y => {
    const head = new SphereGeometry(0.011, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    head.rotateX(-Math.PI / 2).translate(0, y, -0.013)
    return head
  })
  const pieces = [plate, arm, ...rivets]
  const geometry = mergeGeometries(pieces)
  for (const piece of pieces) {
    piece.dispose()
  }
  return geometry
}