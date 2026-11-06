import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BoxGeometry, CatmullRomCurve3, SphereGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {lodgeHatchetHook} from './layout.ts'

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

/** Leather loop fastened to the hook, remaining in the Lodge when the hatchet is taken. */
export function createLodgeHatchetLeatherGeometry() {
  // Ends lie under the swell at the butt; the loop bows around the hook's upturned end.
  const loop = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(-0.026, 0.055, 0),
    new Vector3(-0.03, -0.035, 0),
    new Vector3(-0.019, -0.124, 0),
    new Vector3(0, -0.147, 0),
    new Vector3(0.019, -0.124, 0),
    new Vector3(0.03, -0.035, 0),
    new Vector3(0.026, 0.055, 0),
  ]), 32, 0.0045, 6, false)
  const wrap = new TubeGeometry(new CatmullRomCurve3(Array.from({length: 18}, (_unused, index) => {
    const angle = 2 * Math.PI * index / 18
    return new Vector3(0.028 * Math.sin(angle), 0.055, 0.018 * Math.cos(angle))
  }), true), 36, 0.0048, 6, true)
  const geometry = mergeGeometries([loop, wrap])
  loop.dispose()
  wrap.dispose()
  // Preserve the original hanging pose, but bake it into the fireplace hook frame.
  geometry.rotateX(Math.PI)
  geometry.translate(...lodgeHatchetHook.hatchetOffset)
  return geometry
}
