import type {Texture} from 'three/webgpu'

import {color, float, mix, uv, vec2} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
    this.anisotropy = 0.85
    const tube = uv()
    const {rim, near, intimate} = viewerFrame()
    // Microscopic woven yarn structure: warp along knot tube length, weft around tube circumference
    const warpAngle = tube.x.mul(Math.PI * 360)
    const weftAngle = tube.y.mul(Math.PI * 90)
    const warpYarn = warpAngle.cos().mul(0.5).add(0.5)
    const weftYarn = weftAngle.cos().mul(0.5).add(0.5)
    // Twill weave interlace pattern
    const twillPhase = warpAngle.add(weftAngle.mul(2))
    const twillOver = twillPhase.sin().smoothstep(-0.15, 0.15)
    const weaveHeight = mix(warpYarn, weftYarn, twillOver)
    // Optical moiré interference ripples that drift across the fabric under perspective changes
    const moireA = warpAngle.mul(0.985).add(weftAngle.mul(0.06)).cos()
    const moireB = weftAngle.mul(0.975).sub(warpAngle.mul(0.04)).cos()
    const moireRipples = moireA.mul(moireB).smoothstep(-0.35, 0.35)
    // Ornate celestial jacquard damask brocade embroidery
    const motifX = tube.x.mul(Math.PI * 18).cos()
    const motifY = tube.y.mul(Math.PI * 6).cos()
    const harmonic = tube.x.mul(Math.PI * 36).sin().mul(0.3)
    const damaskField = motifX.mul(motifY).add(harmonic)
    const brocadeMotif = damaskField.abs().smoothstep(0.42, 0.72)
    const fineStitch = opticalLine(tube.x.mul(Math.PI * 72).sin(), 0.1).mul(brocadeMotif)
    // Silk base color vs raised platinum-gold brocade embroidery
    const midnightSilk = mix(color('#05070c'), color('#111824'), moireRipples.mul(0.4))
    const platinumGold = mix(color('#d8e0e8'), color('#ffd470'), fineStitch)
    const fabricColor = mix(midnightSilk, platinumGold, brocadeMotif)
    this.colorNode = fabricColor
    this.metalnessNode = mix(float(0.12), float(0.92), brocadeMotif)
    this.roughnessNode = mix(float(0.36), float(0.16), brocadeMotif).add(weaveHeight.mul(0.06))
    // Velvet-like textile sheen
    this.sheen = 1
    this.sheenColor.set('#849bb5')
    this.sheenRoughness = 0.32
    // Directional anisotropy: yarn highlights alternate between warp (1, 0) and weft (0, 1)
    const yarnDirection = mix(vec2(1, 0), vec2(0, 1), twillOver)
    this.anisotropyNode = yarnDirection.mul(0.85)
    // Microscopic woven textile normal map
    const textileNormal = proceduralNormal(weaveHeight.mul(0.0012).add(brocadeMotif.mul(0.003)), 0.8)
    this.normalNode = textileNormal
    // Starlight threads in the damask embroidery that twinkle with metallic glints
    const brocadeGlints = glints(textileNormal, 80).mul(brocadeMotif).mul(near.mul(0.6).add(0.4))
    // Subtle celestial luminescence in the woven starlight filigree
    const starlightEmission = color('#e0f0ff')
      .mul(brocadeMotif)
      .mul(fineStitch)
      .mul(intimate.mul(0.7).add(0.3))
      .mul(0.75)
    const silkLuster = color('#507090').mul(rim.pow(2.2)).mul(moireRipples).mul(0.35)
    const threadSparkle = color('#fff5e0').mul(brocadeGlints).mul(1.5)
    this.emissiveNode = starlightEmission
      .add(silkLuster)
      .add(threadSparkle)
  }
}
