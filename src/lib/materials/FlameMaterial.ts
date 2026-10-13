import {attribute, cameraFar, cameraNear, cameraPosition, float, max, modelWorldMatrixInverse, mx_noise_float, perspectiveDepthToViewZ, positionView, screenUV, smoothstep, time, uv, vec2, vec3, vec4, viewportDepthTexture} from 'three/tsl'
import {AdditiveBlending, MeshBasicNodeMaterial} from 'three/webgpu'

import fireColor from './fireColor.ts'

/** Upward scroll of the turbulence in noise units per second; at 4 units per meter, the coarse eddies rise at about 1.4 m/s. */
const rise = 5.5
/** How bright the hottest core of a flame glows; values above 1 feed the bloom pass. */
const brightness = 1.3
/** Depth in meters over which a flame fades in front of the surface behind it. */
const softness = 0.07

/**
 * Procedural flame sheets for `FlameGeometry`.
 *
 * Every quad turns around its vertical axis toward the camera. Two octaves of noise flow upward through each sheet at a physical scale, push the flame sideways more and more with height and eat it away from the top, so it breaks into licking tongues. The remaining density is a temperature: a hot yellow core cools to orange and deep red toward the edges and tips.
 *
 * Flames are light, not surfaces – they blend additively, never write depth and ignore scene lighting. Fragments without any heat are discarded.
 */
export default class FlameMaterial extends MeshBasicNodeMaterial {
  constructor() {
    super({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    })
    this.name = 'lodge-flame'
    const origin = attribute<'vec3'>('flameOrigin', 'vec3')
    const size = attribute<'vec2'>('flameSize', 'vec2')
    const seed = attribute<'float'>('flameSeed', 'float')
    const corner = uv()
    // Cylindrical billboard: stay upright, turn the face toward the camera.
    const camera = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
    const toCamera = camera.xz.sub(origin.xz)
    const right = vec3(toCamera.y, 0, toCamera.x.negate()).div(max(toCamera.length(), float(1e-4)))
    this.positionNode = origin.add(right.mul(corner.x.sub(0.5).mul(size.x))).add(vec3(0, corner.y.mul(size.y), 0))
    const v = corner.y
    // Noise in meters, so wide and narrow flames share the same eddy size.
    const metric = vec2(corner.x.sub(0.5).mul(size.x), v.mul(size.y))
    const offset = seed.mul(37)
    const coarse = mx_noise_float(vec3(metric.x.mul(5).add(offset), metric.y.mul(4).sub(time.mul(rise)), time.mul(0.7).add(offset)))
    const fine = mx_noise_float(vec3(metric.x.mul(12).sub(offset), metric.y.mul(10).sub(time.mul(rise * 2.1)), time.mul(1.4).add(offset)))
    const turbulence = coarse.mul(0.7).add(fine.mul(0.3))
    // The whole flame sways slowly, the tip most.
    const sway = time.mul(1.9).add(seed.mul(6.283)).sin().mul(0.12).add(time.mul(3.3).add(seed.mul(17)).sin().mul(0.05))
    const x = corner.x.sub(0.5).mul(2).add(turbulence.add(sway).mul(v.pow(1.2)).mul(0.75))
    // Teardrop: full width just above the base, tapering to a point at the top.
    const width = v.oneMinus().pow(0.85).mul(smoothstep(0, 0.22, v).mul(0.35).add(0.65))
    const body = smoothstep(0.3, 1, x.abs().div(max(width, float(1e-3)))).oneMinus()
    // Turbulence eats the flame from the top down; what survives up there are separate tongues.
    const erosion = mx_noise_float(vec3(metric.x.mul(7).add(offset), metric.y.mul(5.5).sub(time.mul(rise * 1.3)), time.mul(0.9))).mul(0.5).add(0.5)
    // Never let a displaced flame reach the side of its quad.
    const border = smoothstep(0.8, 1, corner.x.sub(0.5).abs().mul(2)).oneMinus()
    const density = body.mul(smoothstep(0, 0.14, v)).mul(border).sub(v.pow(1.4).mul(erosion).mul(1.15)).clamp()
    // Hotter, denser gas sits low in the flame.
    // Soft intersections: fade out where wood sits just behind the sheet, so a log crossing a flame never shows a hard seam.
    const behind = positionView.z.sub(perspectiveDepthToViewZ(viewportDepthTexture(screenUV), cameraNear, cameraFar))
    const soft = smoothstep(0, softness, behind)
    const heat = density.smoothstep(0.02, 0.65).mul(v.mul(-0.5).add(0.95)).mul(soft)
    this.colorNode = fireColor(heat).mul(brightness)
    this.opacityNode = float(1)
    // Ambient occlusion and temporal antialiasing read the normal and velocity targets, which every fragment overwrites without blending. Keep the empty rest of each quad out of them.
    this.maskNode = heat.greaterThan(1 / 256)
  }

  /** Glowing gas has no surface. Facing the camera, it leaves ambient occlusion of the wall behind it close to correct. */
  override setupNormal() {
    return vec3(0, 0, 1)
  }
}
