import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_vec3, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import {angle, ring, stroke, wave} from '../../candidates/gpt_astra/lib/exhibition/fields.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Bookmatched burl marquetry with engraved annual rings, sapwood and turquoise stringing.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.7)
    this.name = knotData.id
    const {p, view, intimate, grazing} = viewerFrame()
    const tube = uv()
    const modules = vec2(18, 3)
    const q = tube.mul(modules)
    const aa = q.fwidth().length().max(0.0001)
    const cell = q.floor().mod(modules).add(modules).mod(modules)
    const seed = mx_cell_noise_vec3(vec3(cell, 43))
    const c = q.fract().sub(0.5)
    // Mirroring, rather than random rotation, produces the deliberate bookmatched cabinetmaker’s cut.
    const woodPoint = vec2(c.x.abs().mul(1.3).add(0.08), c.y.mul(0.72))
    const woodNoise = mx_noise_float(vec3(woodPoint.mul(11), seed.x.mul(18)))
    const burlPoint = woodPoint.add(vec2(woodNoise, mx_noise_float(vec3(woodPoint.mul(9).add(7), seed.y.mul(13)))).mul(0.065))
    const theta = angle(burlPoint)
    const r = burlPoint.length()
    const curl = theta.mul(5).sin().mul(0.045).add(theta.mul(9).cos().mul(0.015))
    const rings = r.add(curl).mul(160).add(seed.x.mul(8))
    const grain = wave(rings).mul(0.5).add(0.5)
    const fine = wave(rings.mul(3).add(theta.mul(7).sin())).mul(0.5).add(0.5)
    const shade = grain.pow(3).mul(0.3).add(fine.mul(0.06)).add(woodNoise.mul(0.22)).add(0.3).clamp()
    const annual = mix(color('#200b08'), color('#894823'), shade)
    const sapwood = mix(annual, color('#ae794a'), r.smoothstep(0.42, 0.64).mul(0.68))
    const diamond = c.x.abs().add(c.y.abs().mul(0.8))
    const inlay = stroke(diamond.sub(0.39), 0.009, aa)
    const binding = stroke(diamond.sub(0.412), 0.003, aa).max(stroke(diamond.sub(0.368), 0.003, aa))
    const miter = stroke(c.x.abs().max(c.y.abs()).sub(0.494), 0.006, aa)
    const pin = ring(c.length(), 0.047, 0.005, aa)
    const chatoyance = theta.mul(2).add(view.x.mul(4)).add(view.y.mul(2)).cos().mul(0.16).add(0.84)
    const paleWood = mix(color('#704329'), color('#c6a475'), shade)
    const lightInlay = diamond.smoothstep(0.35, 0.39).oneMinus().mul(seed.z.smoothstep(0.3, 0.55))
    let wood = mix(sapwood.mul(0.65), paleWood, lightInlay).mul(chatoyance)
    wood = mix(wood, color('#2a1820'), miter.mul(0.7))
    wood = mix(wood, mix(color('#237976'), color('#79b7a6'), grain), inlay)
    const brass = binding.max(pin)
    this.colorNode = mix(wood, color('#c5a565'), brass)
    this.metalnessNode = brass.mul(0.75)
    this.roughnessNode = mix(float(0.34).add(grain.mul(0.07)), float(0.24), brass)
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.16
    this.anisotropy = 0.42
    this.anisotropyNode = vec2(theta.cos(), theta.sin()).mul(brass.oneMinus()).mul(0.42)
    const pores = mx_noise_float(p.mul(vec3(300, 65, 190))).mul(0.5).add(0.5)
    this.normalNode = proceduralNormal(grain.mul(0.00018).add(fine.mul(intimate).mul(0.00004)).sub(miter.mul(0.001)).add(brass.mul(0.0003)).add(pores.mul(intimate).mul(0.00008)), 0.7)
    const sap = tube.x.mul(Math.PI * 6).sub(time.mul(0.2)).sin().mul(0.5).add(0.5).pow(10)
    this.emissiveNode = color('#76cbb7').mul(inlay).mul(sap).mul(grazing.mul(0.2).add(intimate.mul(0.1)))
  }
}
