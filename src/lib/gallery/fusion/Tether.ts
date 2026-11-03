import type {Node} from 'three/webgpu'

import {cameraPosition, cross, exp, float, mix, mx_noise_float, positionGeometry, sin, smoothstep, uniform, uv, vec2, vec3} from 'three/tsl'
import {AdditiveBlending, Color, Mesh, MeshBasicNodeMaterial, PlaneGeometry, Vector3} from 'three/webgpu'

import TransparentSpriteOutputsNode from '../../rendering/TransparentSpriteOutputsNode.ts'

/** how far the ribbon reaches beyond the knot, in meters, so the knot’s glow is round */
const lead = 0.16
/** how wide the ribbon is at a width of 1, in meters */
const breadth = 0.32
/** a bell curve over `distance`, 1 at 0 and about 0.37 at `size` */
const bell = (distance: Node<'float'>, size: Node<'float'> | number) => {
  const scaled = distance.div(size)
  return exp(scaled.mul(scaled).negate())
}

/**
 * A strand of light by which a fusion’s portal holds on to something orbiting it at the end of the intro: it lashes out from the portal, grips it with a glowing knot at its far end and pulls taut, while beads and a twisted pair of threads run along it into the portal, until the portal lets go and it whips back in.
 * A ribbon turned toward the camera along its length, laid out in world space by the vertex shader from `from`, the knot, to `to`, the portal, so the mesh stays at the scene’s origin.
 */
export default class Tether extends Mesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    /** seconds, which drive its writhing */
    clock: uniform(0),
    /** how brightly it glows; 0 hides it */
    energy: uniform(0),
    /** how far the beads and the threads have run along it into the portal, in radians of their pattern */
    flow: uniform(0),
    /** where it starts, at the knot */
    from: uniform(new Vector3),
    /** its color at the portal */
    rim: uniform(new Color),
    /** how much it writhes, 1 while slack and 0 once taut */
    slack: uniform(1),
    /** how brightly the knot glows */
    knot: uniform(0),
    /** its color at the knot */
    swirl: uniform(new Color),
    /** where it ends, at the portal’s middle */
    to: uniform(new Vector3),
    /** how thick it is, about 1 */
    width: uniform(1),
  }

  constructor(seed: number) {
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    material.blending = AdditiveBlending
    material.name = 'fusion-tether'
    material.mrtNode = new TransparentSpriteOutputsNode
    super(new PlaneGeometry(1, 1, 48, 1), material)
    this.name = 'fusion-tether'
    const {clock, energy, flow, from, knot, rim, slack, swirl, to, width} = this.uniforms
    // A uniform rather than a constant, so every tether shares one pipeline.
    const offset = uniform(seed)
    const course = to.sub(from)
    const length = course.length().max(0.001)
    const direction = course.div(length)
    const span = length.add(lead)
    // meters from the knot toward the portal, negative in the lead beyond the knot
    const travel = positionGeometry.x.add(0.5).mul(span).sub(lead)
    const share = travel.div(length).clamp(0, 1)
    const base = from.add(direction.mul(travel))
    // Across the strand, so that its front faces the camera.
    const side = cross(cameraPosition.sub(base), direction).normalize()
    const bend = cross(side, direction).normalize()
    // It writhes most in the middle and is pinned at both ends.
    const writhe = side.mul(mx_noise_float(vec3(share.mul(3.2), clock.mul(2.3), offset)))
      .add(bend.mul(mx_noise_float(vec3(share.mul(3.2), clock.mul(2.1), offset.add(7.1)))))
      .mul(sin(share.mul(Math.PI)).mul(slack).mul(0.14))
    material.positionNode = base.add(writhe).add(side.mul(positionGeometry.y.mul(width).mul(breadth)))
    const along = uv().x.mul(span).sub(lead)
    const across = uv().y.sub(0.5).mul(width).mul(breadth)
    // Beads run along it into the portal, and two threads twist around its core as they go.
    const beads = sin(along.mul(9).sub(flow)).mul(0.5).add(0.5).pow(6)
    const twist = sin(along.mul(22).sub(flow.mul(1.4))).mul(width).mul(0.032)
    const threads = bell(across.sub(twist), width.mul(0.006)).add(bell(across.add(twist), width.mul(0.006)))
    const strand = bell(across, width.mul(0.014)).mul(1.1).add(bell(across, width.mul(0.045)).mul(0.4))
    const ends = smoothstep(0, 0.06, along).mul(smoothstep(length, length.mul(0.7), along))
    const body = mix(swirl, rim, along.div(length).clamp(0, 1)).mul(strand.mul(beads.mul(1.6).add(0.5)).add(threads.mul(beads.add(0.6)).mul(1.2))).mul(ends).mul(1.7)
    // A white-hot knot at its far end.
    const gripping = vec2(along, across).length()
    const glow = mix(swirl, vec3(1), 0.55).mul(bell(gripping, 0.028).mul(2.2).add(bell(gripping, 0.085).mul(0.6))).mul(knot)
    material.colorNode = body.add(glow.mul(2.5)).mul(energy)
    material.opacityNode = float(1)
    // The vertex shader lays out the ribbon, so the source quad’s bounds say nothing.
    this.frustumCulled = false
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
