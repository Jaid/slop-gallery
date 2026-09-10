import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalViewGeometry, positionGeometry, positionViewDirection, uv, vec2} from 'three/tsl'
import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import knotData from './data.ts'
import {TAU, premiumLine, premiumNormal, premiumDetail, premiumIntimate} from '../../helpers.ts'
export default class SolarReliquaryMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    const p = positionGeometry
    const st = uv()
    const u = st.x.mul(TAU)
    const v = st.y.mul(TAU)
    const detail = premiumDetail()
    const intimate = premiumIntimate()
    const facing = normalViewGeometry.dot(positionViewDirection).abs().clamp()
    const grazing = facing.oneMinus()
    const sweep = v.mul(5).sin().mul(2.6).add(v.mul(2).sin().mul(0.7))
    const engineA = premiumLine(u.mul(36).add(sweep).sin(), 0.055)
    const engineB = premiumLine(u.mul(36).sub(sweep).sin(), 0.055)
    const engine = engineA.max(engineB)
    const panelWave = v.mul(3).sin()
    const panels = panelWave.abs().smoothstep(0.25, 0.43)
    const border = premiumLine(panelWave.abs().sub(0.32), 0.025)
    const borderEcho = premiumLine(panelWave.abs().sub(0.43), 0.016)
    const dotCell = st.mul(vec2(108, 24)).fract().sub(0.5)
    const dots = premiumLine(dotCell.length().sub(0.105), 0.018).mul(panels.oneMinus()).mul(detail)
    const inlay = engine.mul(panels).mul(0.88).add(border).add(borderEcho.mul(0.7)).add(dots.mul(0.75)).clamp()
    const grain = mx_noise_float(p.mul(135)).mul(0.5).add(0.5)
    const gold = mix(color('#815017'), color('#f4ce76'), grain.mul(0.18).add(facing.mul(0.2)).add(0.52))
    this.colorNode = mix(color('#090c10'), gold, inlay)
    this.metalnessNode = mix(float(0.22), float(0.98), inlay)
    this.roughnessNode = mix(float(0.115), grain.mul(0.055).add(0.2), inlay)
    this.anisotropy = 0.48
    this.anisotropyRotation = Math.PI * 0.5
    this.clearcoat = 1
    this.clearcoatRoughness = 0.035
    const engraving = engine.mul(panels).mul(-0.65).sub(border.mul(0.4)).add(grain.mul(intimate).mul(0.025))
    this.normalNode = premiumNormal(engraving, 0.00048)
    // A restrained edge warmth, not a luminous replacement for metallic light.
    this.emissiveNode = color('#d19434').mul(border).mul(grazing.pow(5)).mul(0.055)
    this.envMapIntensity = 1.15
  }
}
