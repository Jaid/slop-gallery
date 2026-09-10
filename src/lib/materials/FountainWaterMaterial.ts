import {bumpMap, color, float, mix, mx_noise_float, normalLocal, positionGeometry, time, uv, vec3} from 'three/tsl'
import {DoubleSide, MeshPhysicalNodeMaterial} from 'three/webgpu'

/** Dielectric water with animated ripples, moving flow streaks and aerated edges. */
export class FountainWaterMaterial extends MeshPhysicalNodeMaterial {
  constructor(stream = false, quality = true) {
    const transmission = stream ? 0.8 : 0.55
    super({
      color: '#76b8ac',
      metalness: 0,
      roughness: stream ? 0.045 : 0.075,
      ior: 1.333,
      transmission: quality ? transmission : 0,
      thickness: stream ? 0.045 : 0.2,
      attenuationColor: '#47998e',
      attenuationDistance: 1.5,
      transparent: stream,
      opacity: stream ? 0.7 : 1,
      depthWrite: !stream,
      side: DoubleSide,
      envMapIntensity: quality ? 1.3 : 0.6,
      clearcoat: 0.5,
      clearcoatRoughness: 0.07,
    })
    if (stream) {
      const flow = uv().x.mul(27).sub(time.mul(8)).sin().mul(0.5).add(0.5)
      const streak = mx_noise_float(vec3(uv().mul(12), time.mul(-2))).mul(0.5).add(0.5)
      this.colorNode = mix(color('#b7dfd8'), color('#f0faf6'), flow.mul(streak).mul(0.3))
      this.normalNode = bumpMap(flow.mul(0.12).add(streak.mul(0.3)), float(0.003))
      this.positionNode = positionGeometry.add(normalLocal.mul(flow.mul(streak).sub(0.25).mul(0.003)))
    } else {
      const p = positionGeometry.xz
      const wave = p.x.mul(12).add(p.y.mul(7)).sub(time.mul(2.4)).sin().mul(0.006)
        .add(p.x.mul(-8).add(p.y.mul(17)).sub(time.mul(3.1)).sin().mul(0.004))
        .add(p.length().mul(28).sub(time.mul(5)).sin().mul(0.003))
      const grain = mx_noise_float(vec3(p.mul(7), time.mul(0.35)))
      const shore = uv().sub(0.5).length().smoothstep(0.44, 0.5)
      const foam = shore.mul(grain.mul(0.5).add(0.5).smoothstep(0.35, 0.8)).mul(0.65)
      this.colorNode = mix(color('#41877f'), color('#cbe9df'), foam.add(wave.mul(6)).clamp())
      this.normalNode = bumpMap(wave.add(grain.mul(0.002)), float(1))
      this.positionNode = positionGeometry.add(normalLocal.mul(wave))
      this.roughnessNode = foam.mul(0.2).add(0.075)
    }
  }
}
