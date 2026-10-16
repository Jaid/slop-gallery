import {atan, color, float, max, mix, mx_noise_float, normalGeometry, positionGeometry, select, vec2, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal, line, visibleDetail} from './filters.ts'

/**
 * Split-free seasoned firewood for a `LogGeometry` (axis along y): furrowed gray-brown bark on the sides, pale end grain with growth rings and drying checks on the sawn ends.
 */
export default class FirewoodMaterial extends MeshStandardNodeMaterial {
  /** @param logRadius mean radius of the logs, in meters */
  constructor(logRadius: number) {
    super({
      roughness: 0.88,
      envMapIntensity: 0.15,
    })
    const p = positionGeometry
    const end = normalGeometry.y.abs().greaterThan(0.75)
    const radius = vec2(p.x, p.z).length()
    const angle = atan(p.z, p.x)
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth())
    // Bark: deep vertical furrows broken into plates.
    const furrow = mx_noise_float(vec3(angle.mul(4), p.y.mul(6), 1.7)).add(mx_noise_float(vec3(angle.mul(11), p.y.mul(2.5), 4.1)).mul(0.5))
    const plates = furrow.abs().smoothstep(0, 0.35)
    const lichen = mx_noise_float(p.mul(11)).smoothstep(0.45, 0.8)
    const bark = mix(mix(color('#2b2219'), color('#5e5040'), plates), color('#6f7353'), lichen.mul(0.35))
    // End grain: rings around a slightly off-center pith, darker sapwood rim and radial checks.
    const ringRadius = radius.add(mx_noise_float(vec3(angle.mul(2), 0, 3.3)).mul(0.004))
    const ringPhase = ringRadius.mul(320)
    const rings = mix(ringPhase.sin().mul(0.5).add(0.5).pow(3), float(0.25), ringPhase.fwidth().smoothstep(0.8, 2.4))
    const checkAngle = angle.mul(5).add(mx_noise_float(vec3(radius.mul(30), 0, 7.1)).mul(0.6)).sin()
    const checks = line(checkAngle.mul(radius), 0.0008).mul(radius.smoothstep(0.02, 0.05))
    const sap = radius.div(logRadius).smoothstep(0.78, 1)
    const endGrain = mix(mix(color('#c9a477'), color('#8c6640'), rings.mul(0.6)), color('#4b3523'), sap.mul(0.7).add(checks.mul(0.6)).min(1))
    this.colorNode = select(end, endGrain, bark)
    this.roughnessNode = select(end, float(0.8), plates.mul(-0.1).add(0.95))
    const detail = visibleDetail(footprint, 0.02)
    this.normalNode = heightNormal(select(end, checks.mul(-0.001), plates.mul(0.004)).mul(detail))
  }
}
