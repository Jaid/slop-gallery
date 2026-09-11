import {bumpMap, color, float, mix, mx_noise_float, positionWorld, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Vertical cedar boards, with narrow dark seams and grain at physical scale. */
export default class LodgeWoodMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      roughness: 0.78,
      envMapIntensity: 0.25,
    })
    const across = positionWorld.x.add(positionWorld.z)
    const course = across.div(0.25)
    const board = course.fract()
    // Analytically filter fine seams and grain on long, grazing-angle stair walls.
    const footprint = course.fwidth().mul(0.5).max(0.0125)
    const seam = mix(board.min(board.oneMinus()).smoothstep(float(0.0275).sub(footprint), float(0.0275).add(footprint)), float(0.945), course.fwidth().smoothstep(0.1, 0.3))
    const grain = mx_noise_float(positionWorld.mul(vec3(42, 1.8, 42)))
    const phase = across.mul(95).add(grain.mul(5))
    const rings = mix(phase.sin().mul(0.5).add(0.5), float(0.5), phase.fwidth().smoothstep(1, 3))
    const tone = mx_noise_float(across.div(0.25).floor().mul(4.7)).mul(0.16).add(0.8)
    this.colorNode = mix(color('#211710'), mix(color('#624027'), color('#936841'), rings.mul(0.4).add(0.3)).mul(tone), seam)
    this.normalNode = bumpMap(seam.mul(0.5).add(rings.mul(0.1)), float(0.035))
  }
}
