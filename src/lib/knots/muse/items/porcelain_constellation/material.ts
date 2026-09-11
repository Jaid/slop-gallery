import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_worley_noise_float, normalViewGeometry, time, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {cellNoiseVec3, filament, glints, proceduralNormal, viewerFrame} from '../../helpers.ts'
import knotData from './data.ts'

export default class PorcelainConstellationMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, facing, grazing, rim, near, intimate} = viewerFrame()
    const reveal = grazing.pow(2).mul(0.85).add(intimate.mul(0.65)).add(near.mul(0.25)).clamp()
    const w1 = mx_worley_noise_float(p.mul(5.5))
    const w2 = mx_worley_noise_float(p.mul(5.5).add(vec3(3.7, 8.2, 1.9)))
    const goldLarge = filament(w1.sub(w2), 0.022)
    const w3 = mx_worley_noise_float(p.mul(14).add(2.4))
    const w4 = mx_worley_noise_float(p.mul(14).add(vec3(7.7, 1.2, 5.5)))
    const goldFine = filament(w3.sub(w4), 0.015).mul(near.mul(0.7).add(0.3))
    const kintsugi = goldLarge.add(goldFine.mul(0.6)).clamp()
    const sq = p.mul(22).add(vec3(0, time.mul(0.01), 0))
    const srnd = cellNoiseVec3(sq)
    const srnd2 = cellNoiseVec3(sq.add(31.7))
    const sdist = sq.fract().sub(srnd.mul(0.6).add(0.2)).length()
    const sfoot = sq.fwidth().length().max(0.001)
    const starCore = sdist.smoothstep(0, sfoot.mul(0.9).max(0.05)).oneMinus()
    const starGate = srnd2.x.smoothstep(0.78, 0.84)
    const starTw = time.mul(srnd2.y.mul(3).add(1)).add(srnd2.z.mul(30)).sin().mul(0.35).add(0.75)
    const stars = starCore.mul(starGate).mul(starTw).mul(sfoot.smoothstep(0.25, 1.1).oneMinus())
    const constellationVeil = mx_noise_float(p.mul(3)).mul(0.5).add(0.5)
    const midnight = mix(color('#0a1230'), color('#1e2a5e'), constellationVeil)
    const porcelain = color('#f6f1e6')
    const gold = mix(color('#8a5a1a'), color('#ffd873'), srnd2.y)
    this.colorNode = mix(mix(porcelain, midnight, stars.mul(reveal).mul(0.85)), gold, kintsugi.mul(0.95))
    this.metalnessNode = kintsugi.mul(0.95)
    this.roughnessNode = float(0.24).add(kintsugi.mul(-0.08)).add(stars.mul(reveal).mul(0.1))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.06
    this.iridescence = 0.25
    this.iridescenceIOR = 1.5
    this.iridescenceThicknessNode = facing.mul(180).add(280)
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(32)).mul(0.12).add(kintsugi.mul(0.4)), 0.0007)
    const glintGold = glints(normalViewGeometry.normalize(), 60)
    this.emissiveNode = color('#7fa8ff').mul(stars).mul(reveal).mul(1.6).add(gold.mul(kintsugi).mul(glintGold).mul(1.2).mul(reveal.mul(0.6).add(0.4))).add(color('#3a5aff').mul(rim).mul(reveal).mul(0.3)).add(color('#fff3d0').mul(kintsugi).mul(intimate).mul(0.35))
  }
}
