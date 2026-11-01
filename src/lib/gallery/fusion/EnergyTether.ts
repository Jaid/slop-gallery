import {cameraPosition, cross, exp, float, mix, mx_noise_float, positionGeometry, sin, smoothstep, uniform, uv, vec3} from 'three/tsl'
import {AdditiveBlending, Color, Mesh, MeshBasicNodeMaterial, PlaneGeometry, Vector3} from 'three/webgpu'

import {TransparentSpriteOutputsNode} from '../../rendering/GalleryRenderPipeline.ts'

/**
 * A crackling strand of energy that binds something orbiting a fusion’s portal to its middle, with bright pulses running along it into the portal.
 * A ribbon turned toward the camera along its length, laid out in world space by the vertex shader between `from` and `to`, so the mesh stays at the scene’s origin.
 */
export default class EnergyTether extends Mesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    clock: uniform(0),
    /** how brightly it glows; 0 hides it */
    energy: uniform(0),
    /** where it starts, at what orbits */
    from: uniform(new Vector3),
    /** its color at the portal */
    rim: uniform(new Color),
    /** its color at what orbits */
    swirl: uniform(new Color),
    /** where it ends, at the portal’s middle */
    to: uniform(new Vector3),
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
    super(new PlaneGeometry(1, 1, 40, 1), material)
    this.name = 'fusion-tether'
    const {clock, energy, from, rim, swirl, to} = this.uniforms
    // A uniform rather than a constant, so every tether shares one pipeline.
    const offset = uniform(seed)
    const along = positionGeometry.x.add(0.5)
    const base = mix(from, to, along)
    const direction = to.sub(from)
    // Across the strand, so that its front faces the camera.
    const side = cross(cameraPosition.sub(base), direction).normalize()
    const bend = cross(side, direction).normalize()
    // It writhes most in the middle and is pinned at both ends.
    const writhe = side.mul(mx_noise_float(vec3(along.mul(3.2), clock.mul(2.3), offset)))
      .add(bend.mul(mx_noise_float(vec3(along.mul(3.2), clock.mul(2.1), offset.add(7.1)))))
      .mul(sin(along.mul(Math.PI)).mul(0.14))
    material.positionNode = base.add(writhe).add(side.mul(positionGeometry.y.mul(0.14)))
    const across = uv().y.sub(0.5).mul(2)
    const strand = exp(across.mul(across).mul(-22)).mul(1.6).add(exp(across.mul(across).mul(-4)).mul(0.35))
    const pulses = sin(uv().x.mul(12).sub(clock.mul(9))).mul(0.5).add(0.5).pow(6)
    const ends = smoothstep(0, 0.1, uv().x).mul(smoothstep(1, 0.7, uv().x))
    material.colorNode = mix(swirl, rim, uv().x).mul(strand.mul(pulses.mul(1.6).add(0.5)).mul(ends).mul(energy).mul(2.5))
    material.opacityNode = float(1)
    // The vertex shader lays out the ribbon, so the source quad’s bounds say nothing.
    this.frustumCulled = false
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
