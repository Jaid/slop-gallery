import type {PortalFrame} from './portalFrame.ts'
import type {Node} from 'three/webgpu'

import {cameraPosition, cos, cross, exp, float, mix, mx_noise_float, positionGeometry, sin, smoothstep, uniform, uv, vec3} from 'three/tsl'
import {AdditiveBlending, Color, Mesh, MeshBasicNodeMaterial, PlaneGeometry, Vector3} from 'three/webgpu'

import {TransparentSpriteOutputsNode} from '../../rendering/GalleryRenderPipeline.ts'

/** how wide the trail is at a width of 1, in meters */
const breadth = 0.46
const toHead = new Vector3
/** a bell curve over `distance`, 1 at 0 and about 0.37 at `size` */
const bell = (distance: Node<'float'>, size: Node<'float'> | number) => {
  const scaled = distance.div(size)
  return exp(scaled.mul(scaled).negate())
}

/**
 * A comet’s tail of fire that something leaves behind as it whips around a fusion’s portal, lying on the orbit’s tilted ellipse: hottest at its head, fraying and flickering toward its tail. Long enough, two of them close into a ring of fire.
 * A ribbon turned toward the camera along its length, laid out in world space by the vertex shader from the orbit’s frame, so the mesh stays at the scene’s origin.
 */
export default class OrbitTrail extends Mesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    /** along the wall and across it, the orbit’s semi-axes in meters */
    along: uniform(1),
    across: uniform(1),
    /** the orbit angle of its head, in radians */
    angle: uniform(0),
    /** the portal’s middle */
    center: uniform(new Vector3),
    /** seconds, which drive its flicker */
    clock: uniform(0),
    /** how brightly it glows; 0 hides it */
    energy: uniform(0),
    /** how many radians of the orbit it covers behind its head */
    length: uniform(0),
    /** out of the wall */
    normal: uniform(new Vector3(0, 0, 1)),
    /** how far out on the orbit it lies, 1 on it and 0 in the portal’s middle */
    reach: uniform(1),
    rim: uniform(new Color),
    swirl: uniform(new Color),
    /** along the wall */
    tangent: uniform(new Vector3(1, 0, 0)),
    /** how much higher than the portal the orbit passes on the wall’s side */
    tilt: uniform(0),
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
    material.name = 'fusion-orbit-trail'
    material.mrtNode = new TransparentSpriteOutputsNode
    super(new PlaneGeometry(1, 1, 128, 1), material)
    this.name = 'fusion-orbit-trail'
    const {across, along, angle, center, clock, energy, length, normal, reach, rim, swirl, tangent, tilt, width} = this.uniforms
    // A uniform rather than a constant, so every trail shares one pipeline.
    const offset = uniform(seed)
    // 0 at its tail, 1 at its head
    const share = positionGeometry.x.add(0.5)
    const theta = angle.sub(length.mul(float(1).sub(share)))
    const up = vec3(0, 1, 0)
    /** the point of the orbit at `turn` radians, like `orbitPoint` */
    const point = (turn: Node<'float'>) => center.add(tangent.mul(along.mul(cos(turn))).add(normal.mul(across.mul(sin(turn)))).sub(up.mul(tilt.mul(sin(turn)))).mul(reach))
    const base = point(theta)
    const direction = tangent.mul(along.mul(sin(theta)).negate()).add(normal.mul(across.mul(cos(theta)))).sub(up.mul(tilt.mul(cos(theta)))).normalize()
    // Across the trail, so that its front faces the camera.
    const side = cross(cameraPosition.sub(base), direction).normalize()
    // It thins toward its tail.
    const thickness = width.mul(share.mul(0.65).add(0.35))
    material.positionNode = base.add(side.mul(positionGeometry.y.mul(thickness).mul(breadth)))
    const lengthwise = uv().x
    const crosswise = uv().y.sub(0.5).mul(thickness).mul(breadth)
    const flicker = mx_noise_float(vec3(theta.mul(4), clock.mul(5), offset)).mul(0.5).add(0.5)
    const fray = smoothstep(0.15, 0.85, flicker.add(lengthwise.mul(0.7)))
    const core = bell(crosswise, thickness.mul(0.022)).mul(1.4).add(bell(crosswise, thickness.mul(0.07)).mul(0.45))
    const heat = lengthwise.pow(1.6)
    const color = mix(swirl, rim, heat).add(vec3(heat.pow(4).mul(0.8)))
    material.colorNode = color.mul(core).mul(fray).mul(heat.mul(0.85).add(0.15)).mul(smoothstep(0, 0.12, lengthwise)).mul(energy).mul(2.2)
    material.opacityNode = float(1)
    // The vertex shader lays out the ribbon, so the source quad’s bounds say nothing.
    this.frustumCulled = false
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }

  /** Lays it on the orbit of `frame`, its head where `head` is and `reach` times as far out from the portal’s middle. */
  follow({center, normal, orbit, tangent}: PortalFrame, head: Vector3, reach: number) {
    const {uniforms} = this
    uniforms.along.value = orbit.along
    uniforms.across.value = orbit.across
    uniforms.tilt.value = orbit.tilt
    uniforms.center.value.fromArray(center)
    uniforms.tangent.value.fromArray(tangent)
    uniforms.normal.value.fromArray(normal)
    toHead.subVectors(head, uniforms.center.value)
    const x = toHead.dot(uniforms.tangent.value) / orbit.along
    const z = toHead.dot(uniforms.normal.value) / orbit.across
    uniforms.angle.value = Math.atan2(z, x)
    uniforms.reach.value = Math.hypot(x, z) * reach
  }
}
