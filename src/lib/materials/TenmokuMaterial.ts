import {color, float, max, mix, mx_noise_float, mx_worley_noise_float, positionGeometry, vec3} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from './filters.ts'

/**
 * Oil-spot tenmoku for the noir planter: a lustrous black iron glaze that broke into silvery, faintly iridescent spots in the kiln, with fine rust-brown hare’s fur streaks running down from the rim, where the glaze thinned to amber brown. It pooled thick and glassy toward the foot and stops short of it in a rolled edge over the bare dark clay.
 *
 * Mapped in the pot’s own frame, its height from the lathe’s foot at 0.13 m up to the lip at 0.8 m.
 */
export default class TenmokuMaterial extends MeshPhysicalNodeMaterial {
  constructor({foot = 0.13, lip = 0.8}: {
    foot?: number
    lip?: number
  } = {}) {
    super({
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      iridescenceIOR: 1.8,
      iridescenceThicknessMinimum: 250,
      iridescenceThicknessMaximum: 600,
      envMapIntensity: 0.9,
    })
    this.name = 'Oil-spot tenmoku'
    const p = positionGeometry
    const height = p.y.sub(foot).div(lip - foot)
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth())
    // Where the glaze ends: a little above the foot, its edge wandering.
    const glazeEdge = float(0.07).add(mx_noise_float(p.mul(9)).mul(0.025))
    const glazed = height.smoothstep(glazeEdge, glazeEdge.add(0.01))
    const roll = height.sub(glazeEdge.add(0.012)).abs().smoothstep(0.012, 0).mul(glazed)
    const thin = height.smoothstep(0.9, 1).mul(mx_noise_float(p.mul(vec3(160, 9, 160))).mul(0.5).add(0.6).clamp())
    // Hare’s fur: fine streaks running down, most from the upper half.
    const fur = mx_noise_float(p.mul(vec3(220, 6, 220))).mul(0.5).add(0.5).smoothstep(0.5, 0.85).mul(height.smoothstep(0.3, 0.95)).mul(visibleDetail(footprint, 0.004).mul(0.6).add(0.4))
    // Oil spots of wandering size, crowding in drifts in a band below the shoulder.
    const cells = mx_worley_noise_float(p.mul(vec3(70, 52, 70)))
    const size = mx_noise_float(p.mul(11)).mul(0.5).add(0.5)
    const density = height.smoothstep(0.15, 0.5).mul(height.smoothstep(0.9, 0.7)).mul(mx_noise_float(p.mul(4.5).add(2)).mul(0.5).add(0.5).smoothstep(0.15, 0.55))
    const spot = cells.smoothstep(size.mul(0.14).add(0.13), size.mul(0.14).add(0.06)).mul(density).mul(glazed).mul(thin.oneMinus())
    const deep = mix(color('#0b0807'), color('#17110d'), mx_noise_float(p.mul(14)).mul(0.5).add(0.5))
    let glaze = mix(deep, color('#6e3d1c'), fur.mul(0.5))
    glaze = mix(glaze, color('#6a3b1a'), thin.mul(0.85))
    glaze = mix(glaze, color('#8f969d'), spot)
    const clay = mix(color('#2b211b'), color('#3d3027'), mx_noise_float(p.mul(120)).mul(0.5).add(0.5))
    this.colorNode = mix(clay, glaze, glazed)
    this.metalnessNode = spot.mul(0.85)
    this.roughnessNode = mix(float(0.85), float(0.1).add(spot.mul(0.12)).add(fur.mul(0.08)), glazed)
    this.clearcoatNode = glazed
    this.iridescenceNode = spot.mul(0.5)
    this.iridescenceThicknessNode = mx_noise_float(p.mul(40)).mul(180).add(380)
    this.normalNode = heightNormal(roll.mul(0.0012).add(spot.mul(0.00015)).add(mx_noise_float(p.mul(300)).mul(0.00003).mul(glazed.oneMinus())))
  }
}
