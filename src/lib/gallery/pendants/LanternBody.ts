import {BoxGeometry, ConeGeometry, TorusGeometry} from 'three/webgpu'

import PendantBody from './base/PendantBody.ts'

const plateHalf = 0.11
const plateThickness = 0.03
const plateY = 0.17
const roofHeight = 0.1
const ringRadius = 0.022
const ringTube = 0.005
const roofTop = plateY + plateThickness / 2 + roofHeight

/** A square cabin lantern: two plates, four corner posts, a hipped roof and a hanging ring. */
export default class LanternBody extends PendantBody {
  readonly bottom = -(plateY + plateThickness / 2 + 0.05)
  // The rod starts inside the ring’s upper tube, so the two read as one forged piece.
  readonly hook = roofTop + ringRadius * 2 - ringTube * 2
  readonly id = 'lantern'
  // The plates’ corners reach furthest.
  readonly radius = plateHalf * Math.SQRT2
  // The top plate’s edges are 0.82 above the horizon seen from the flame, its corners 0.71; only light bounced inside the glass gets past.
  readonly roof = {
    start: 0.66,
    end: 0.86,
    leak: 0.1,
  }

  frame() {
    const plates = [-1, 1].map(side => {
      const plate = new BoxGeometry(plateHalf * 2, plateThickness, plateHalf * 2)
      return plate.translate(0, side * plateY, 0)
    })
    const posts = [-1, 1].flatMap(x => [-1, 1].map(z => {
      const post = new BoxGeometry(0.018, plateY * 2 - plateThickness, 0.018)
      return post.translate(x * 0.09, 0, z * 0.09)
    }))
    // Four radial segments turned by 45° give a pyramid whose eaves follow the plate edges.
    const roof = new ConeGeometry(0.17, roofHeight, 4)
    roof.rotateY(Math.PI / 4).translate(0, roofTop - roofHeight / 2, 0)
    const finial = new ConeGeometry(0.03, 0.05, 4)
    finial.rotateX(Math.PI).rotateY(Math.PI / 4).translate(0, -(plateY + plateThickness / 2 + 0.025), 0)
    // Overlap the roof’s apex instead of balancing on it.
    const ring = new TorusGeometry(ringRadius, ringTube, 6, 12)
    ring.translate(0, roofTop + ringRadius - ringTube * 2, 0)
    return [...plates, ...posts, roof, finial, ring]
  }

  glow() {
    return [new BoxGeometry(0.13, 0.24, 0.13)]
  }
}
