import {CylinderGeometry, SphereGeometry} from 'three/webgpu'

import PendantBody from './base/PendantBody.ts'

const globeRadius = 0.09
const cupBottom = 0.062
const cupHeight = 0.05
const collarHeight = 0.04

/** An opal schoolhouse globe held by a metal gallery cup and collar. */
export default class GlobeBody extends PendantBody {
  readonly bottom = -globeRadius
  // The rod enters the collar instead of resting on its top face.
  readonly hook = cupBottom + cupHeight + collarHeight - 0.01
  readonly id = 'globe'
  readonly radius = globeRadius
  // The cup’s lower rim is 0.72 above the horizon seen from the center; the opal glass under it still glows a little.
  readonly roof = {
    start: 0.6,
    end: 0.8,
    leak: 0.25,
  }

  frame() {
    // The cup’s lower rim lies inside the globe, so no seam shows between glass and metal.
    if (Math.hypot(0.06, cupBottom) >= globeRadius) {
      throw new RangeError('The gallery cup has to grip the globe below its rim.')
    }
    const cup = new CylinderGeometry(0.035, 0.06, cupHeight, 16)
    cup.translate(0, cupBottom + cupHeight / 2, 0)
    const collar = new CylinderGeometry(0.014, 0.014, collarHeight, 8)
    collar.translate(0, cupBottom + cupHeight + collarHeight / 2, 0)
    return [cup, collar]
  }

  glow() {
    return [new SphereGeometry(globeRadius, 16, 12)]
  }
}
