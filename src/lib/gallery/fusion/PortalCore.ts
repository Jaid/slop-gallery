import type {Node, TextureNode} from 'three/webgpu'

import {atan, cameraProjectionMatrix, cameraViewMatrix, cameraWorldMatrix, cos, exp, float, log, max, mix, modelWorldMatrix, mx_fractal_noise_float, mx_noise_float, positionGeometry, rotate, screenUV, sin, smoothstep, texture, uniform, uv, vec2, vec3, vec4, viewportSharedTexture} from 'three/tsl'
import {AdditiveBlending, Color, DataTexture, Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry, SRGBColorSpace} from 'three/webgpu'

import {TransparentSpriteOutputsNode} from '../../rendering/GalleryRenderPipeline.ts'

/** how far the quad reaches from the portal’s middle, in radii of its disc, for the halo, the lens and the shockwaves */
const reach = 3.2
/** what the portal shows before any ingredient’s image is ready, in the same color space as the artworks, which share its shader */
const blank = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
blank.colorSpace = SRGBColorSpace
blank.needsUpdate = true

/** the colors a portal glows in */
export type PortalPalette = {
  /** the deep middle of the disc */
  core: Color
  /** the hot ring around the disc and the brightest sparks */
  rim: Color
  /** the vortex and the halo */
  swirl: Color
}

/**
 * The glowing heart of a fusion: a disc of swirling energy that always faces the camera, so it reads as a ball from every side, with a hot, wobbling rim, a corona of rays, the shockwaves it sends out and the view around it bent toward it like light around a star.
 * Filling it, the image of an ingredient surfaces from the vortex and sinks back into it, bulging like the inside of a ball, shimmering, wavy and split into its colors while it is half there.
 *
 * It is two quads at the group’s origin: the disc and the lens blend over the scene, the glow adds onto it. Everything the frame changes is a uniform; the group itself only moves.
 */
export default class PortalCore extends Group {
  /** the image the disc shows, swapped for each of the images */
  readonly image: TextureNode
  readonly uniforms = {
    /** width divided by height of the shown image */
    aspect: uniform(1),
    /** how clearly the image shows, from 0, lost in the vortex, to 1 */
    clarity: uniform(0),
    /** seconds the portal is open, which drives its turbulence */
    clock: uniform(0),
    core: uniform(new Color),
    /** how strongly the whole portal glows, about 1 while it brews */
    energy: uniform(0),
    /** a white blaze over the middle, for the moment the result flips out */
    flash: uniform(0),
    /** how strongly it bends the view around it, 0–1 */
    lens: uniform(1),
    /** how far the vortex has turned, in radians */
    phase: uniform(0),
    /** seconds since the last shockwave left the rim */
    pulse: uniform(10),
    /** how bright that shockwave is */
    pulseStrength: uniform(0),
    /** the disc’s radius in meters; 0 hides the portal */
    radius: uniform(0),
    rim: uniform(new Color),
    swirl: uniform(new Color),
  }

  private readonly disc: Mesh<PlaneGeometry, MeshBasicNodeMaterial>
  private readonly glow: Mesh<PlaneGeometry, MeshBasicNodeMaterial>

  constructor() {
    super()
    this.name = 'fusion-portal'
    const {aspect, clarity, clock, core, energy, flash, lens, phase, pulse, pulseStrength, radius, rim, swirl} = this.uniforms
    this.image = texture(blank)
    const geometry = new PlaneGeometry(2, 2)
    // Facing the camera: the corners lie along its right and up in the world, which the group is only shifted from.
    const right = cameraWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz
    const upward = cameraWorldMatrix.mul(vec4(0, 1, 0, 0)).xyz
    const corner = right.mul(positionGeometry.x).add(upward.mul(positionGeometry.y)).mul(radius.mul(reach))
    // in radii of the disc, from its middle
    const p = uv().sub(0.5).mul(2 * reach).toVar('portalPoint')
    const rho = p.length().toVar('portalDistance')
    const angle = atan(p.y, p.x).toVar('portalAngle')
    // The vortex winds tighter toward the middle.
    const swirled = angle.add(float(2.4).div(rho.add(0.3))).sub(phase).toVar('portalSwirl')
    const swirlPoint = vec2(cos(swirled), sin(swirled)).mul(rho)
    const turbulence = mx_fractal_noise_float(vec3(swirlPoint.mul(2.3), clock.mul(0.4)), 3).mul(0.5).add(0.5)
    const arms = sin(swirled.mul(3).add(log(rho.add(0.05)).mul(4.5)).sub(clock.mul(2.2))).mul(0.5).add(0.5)
    const vortex = turbulence.mul(0.65).add(arms.mul(0.45)).clamp(0, 1).toVar('portalVortex')
    // Dark and deep in the middle, where the images surface; the swirl burns brightest toward the rim.
    const bright = vortex.pow(1.6).mul(smoothstep(0, 1, rho).mul(0.75).add(0.25))
    const swirlColor = mix(core, swirl, bright).mul(energy.mul(0.9).add(0.25)).add(swirl.mul(bright.pow(3)).mul(energy).mul(1.2))
    // The image: covering the disc, its shorter side spanning it and the rest cut off, and twisted into the vortex while it is half there. It bulges like the inside of a ball, ever more squeezed, dragged along by the vortex, rippling and split into its colors toward the rim.
    const unclear = float(1).sub(clarity)
    const half = vec2(aspect, 1).div(aspect.min(1)).mul(1.04)
    const outward = rho.min(1).toVar('portalOutward')
    const rimward = outward.pow(3)
    const bulged = p.mul(rimward.mul(0.2).add(0.8))
    const bend = unclear.mul(unclear).mul(4).mul(float(1).sub(rho).max(0).pow(1.5)).add(sin(clock.mul(1.7).add(rho.mul(5))).mul(0.06)).sub(rimward.mul(sin(clock.mul(1.3)).mul(0.08).add(0.3)))
    const turned = rotate(bulged, bend) as unknown as Node<'vec2'>
    const ripple = vec2(sin(turned.y.mul(8).add(clock.mul(3.1))), sin(turned.x.mul(7).sub(clock.mul(2.7)))).mul(outward.mul(outward).mul(0.04).add(0.018))
    const imageUV = turned.add(ripple).div(half.mul(2)).add(0.5).toVar('portalImageUV')
    const split = p.div(max(rho, 0.001)).mul(unclear.mul(0.02).add(0.007)).mul(outward.mul(outward).mul(1.6).add(0.4))
    const picture = vec3(this.image.sample(imageUV.add(split)).r, this.image.sample(imageUV).g, this.image.sample(imageUV.sub(split)).b)
    const shimmer = sin(p.x.mul(7.2).add(p.y.mul(5.4)).sub(clock.mul(5))).mul(0.2).add(sin(rho.mul(14).sub(clock.mul(7))).mul(0.08)).add(1.12)
    const framed = smoothstep(0, 0.02, imageUV.x).mul(smoothstep(1, 0.98, imageUV.x)).mul(smoothstep(0, 0.02, imageUV.y)).mul(smoothstep(1, 0.98, imageUV.y))
    // It surfaces through the noise and sinks back the same way, with a glowing seam along the edge of what is there.
    const grain = mx_noise_float(vec3(p.mul(3.5), clock.mul(0.6))).mul(0.5).add(0.5)
    const surfaced = smoothstep(grain.sub(0.12), grain.add(0.02), clarity.mul(1.15).sub(0.05))
    const seam = surfaced.mul(float(1).sub(surfaced)).mul(4).mul(framed)
    const shown = surfaced.mul(framed).mul(smoothstep(1, 0.8, rho)).toVar('portalShown')
    const discColor = mix(swirlColor, picture.mul(shimmer).add(swirl.mul(0.06)), shown).add(swirl.mul(seam).mul(energy).mul(1.6))
    const discAlpha = smoothstep(1.04, 0.92, rho).mul(0.96)
    // Around the disc, the view bends toward it like light around a star and twists along with the vortex.
    const middle = cameraProjectionMatrix.mul(cameraViewMatrix).mul(modelWorldMatrix.mul(vec4(0, 0, 0, 1)))
    const middleUV = middle.xy.div(middle.w).mul(vec2(0.5, -0.5)).add(0.5)
    const bent = rotate(screenUV.sub(middleUV), float(0.8).div(rho.mul(rho).add(0.25)).mul(energy)) as unknown as Node<'vec2'>
    const lensing = float(1).sub(float(0.55).mul(energy.min(1.2)).div(rho.mul(rho).add(0.15)))
    const lensed = (viewportSharedTexture(middleUV.add(bent.mul(lensing)).clamp(0, 1)) as unknown as Node<'vec4'>).rgb
    const lensAlpha = smoothstep(reach, reach * 0.55, rho).mul(lens).mul(energy.min(1))
    this.disc = new Mesh(geometry, this.material({
      color: mix(lensed, discColor, discAlpha.div(max(discAlpha, lensAlpha).max(0.001))),
      opacity: max(discAlpha, lensAlpha),
      position: corner,
    }))
    this.disc.name = 'fusion-portal-disc'
    // The rim ripples with noise; the corona’s rays turn with the vortex.
    const outside = rho.sub(1).max(0)
    const edge = rho.sub(float(1).add(mx_noise_float(vec3(cos(angle).mul(2.2), sin(angle).mul(2.2), clock.mul(1.1))).mul(0.045))).abs()
    const ring = exp(edge.mul(-26)).add(exp(edge.mul(-7)).mul(0.35))
    const rays = mx_noise_float(vec3(cos(swirled).mul(3), sin(swirled).mul(3), clock.mul(0.5))).mul(0.5).add(0.5)
    const halo = exp(outside.mul(-2.6)).mul(rays.mul(0.6).add(0.4)).mul(smoothstep(0.85, 1.05, rho))
    const front = float(1).add(pulse.mul(3.4))
    const wave = exp(rho.sub(front).abs().mul(-9)).mul(pulseStrength).mul(float(1).sub(pulse.div(0.65)).clamp(0, 1))
    const blaze = exp(rho.mul(-2.4)).mul(flash).mul(3)
    // Everything fades out well before the quad’s edge, or its square would show through the bloom.
    const bounds = smoothstep(reach, reach * 0.7, rho)
    this.glow = new Mesh(geometry, this.material({
      color: rim.mul(ring.mul(energy).mul(2.4).add(wave.mul(3))).add(swirl.mul(halo).mul(energy).mul(0.9)).add(vec3(blaze)).mul(bounds),
      opacity: float(1),
      position: corner,
      additive: true,
    }))
    this.glow.name = 'fusion-portal-glow'
    // The glow adds onto the disc.
    this.glow.renderOrder = 1
    for (const mesh of [this.disc, this.glow]) {
      // The vertex shader places the quad, so its bounds say nothing.
      mesh.frustumCulled = false
      this.add(mesh)
    }
  }

  dispose() {
    this.disc.geometry.dispose()
    this.disc.material.dispose()
    this.glow.material.dispose()
  }

  private material({additive = false, color, opacity, position}: {
    additive?: boolean
    color: Node<'vec3'>
    opacity: Node<'float'>
    position: Node<'vec3'>
  }) {
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    material.name = additive ? 'fusion-portal-glow' : 'fusion-portal-disc'
    if (additive) {
      material.blending = AdditiveBlending
    }
    material.positionNode = position
    material.colorNode = color
    material.opacityNode = opacity
    // Energy has no surface: the normal and motion of what is behind stay for the ambient occlusion and the temporal antialiasing.
    material.mrtNode = new TransparentSpriteOutputsNode
    return material
  }
}
