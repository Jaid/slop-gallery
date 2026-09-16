import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, normalLocal, time, vec3} from 'three/tsl'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {cellNoiseVec3, filament, proceduralNormal, viewerFrame} from '../../helpers.ts'
import knotData from './data.ts'

export default class AbyssalBloomMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, view, facing, grazing, rim, near, intimate} = viewerFrame()
    const breathSlow = time.mul(0.9).sin().mul(0.5).add(0.5)
    this.positionNode = p.add(normalLocal.normalize().mul(breathSlow.mul(0.015).add(0.005)))
    const drift = vec3(time.mul(0.05), time.mul(0.03), time.mul(-0.04))
    const inner = p.sub(view.mul(0.15))
    const baseRaw = mx_fractal_noise_float(inner.mul(2.6).add(drift), 3, 2, 0.5).mul(0.5).add(0.5)
    const base = baseRaw.mul(2).sub(1)
    const veinsLarge = filament(base, 0.12)
    const detailRaw = mx_noise_float(inner.mul(9).add(drift.mul(2))).mul(0.5).add(0.5)
    const capillaries = filament(detailRaw.mul(2).sub(1), 0.08).mul(near.mul(0.7).add(0.3))
    const skinCells = mx_worley_noise_float(p.mul(7).add(drift.mul(0.5)))
    const pulseWave = p.y.mul(3.5).sub(time.mul(1.8)).sin().mul(0.5).add(0.5)
    const heartbeat = time.mul(1.4).sin().mul(0.5).add(0.5).pow(2).mul(0.6).add(0.4)
    const q = inner.mul(26)
    const rnd = cellNoiseVec3(q)
    const rnd2 = cellNoiseVec3(q.add(19.7))
    const centre = rnd.mul(0.6).add(0.2)
    const dist = q.fract().sub(centre).length()
    const footprint = q.fwidth().length().max(0.001)
    const core = dist.smoothstep(0, footprint.mul(1.1).max(0.05)).oneMinus()
    const gate = rnd2.x.smoothstep(0.88, 0.92).mul(intimate.mul(0.7).add(0.3))
    const twinkle = time.mul(rnd2.y.mul(3).add(1)).add(rnd2.z.mul(20)).sin().mul(0.4).add(0.7)
    const plankton = core.mul(gate).mul(twinkle)
    const deep = color('#020610')
    const flesh = color('#0a1e3a').mul(1).add(color('#1a0f3a').mul(skinCells))
    this.colorNode = mix(deep.mul(1), flesh, facing.mul(0.7).add(0.3))
    this.metalness = 0.1
    this.roughnessNode = float(0.32).sub(veinsLarge.mul(0.15)).sub(facing.mul(0.1))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.08
    this.iridescence = 0.55
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = grazing.mul(400).add(180)
    this.normalNode = proceduralNormal(skinCells.mul(0.6).add(baseRaw.mul(0.8)), 0.002)
    const veinTint = mix(color('#00f0ff'), color('#ff2fd6'), view.x.mul(0.5).add(0.5).add(baseRaw.mul(0.4)).clamp())
    const veinGlow = veinsLarge.add(capillaries.mul(0.7)).mul(pulseWave.mul(0.6).add(0.4)).mul(heartbeat)
    this.emissiveNode = veinTint.mul(veinGlow).mul(2.2).mul(near.mul(0.5).add(0.7)).add(color('#9ff6ff').mul(plankton).mul(2)).add(color('#00e5ff').mul(rim).mul(0.55).mul(heartbeat)).add(color('#ff2fd6').mul(grazing.pow(4)).mul(0.4))
  }
}
