import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, positionGeometry} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {craquelure} from './lib/craquelure.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
// A pale celadon bowl that once broke and was mended in gold. The glaze still carries its hairline
// craquelure, but the true fractures run wide and proud with metal, and they catch every light in the room
// while the porcelain stays quiet — closer still and the gold shows its leaf, flake by flake.
    const {p, grazing, near, intimate} = viewerFrame()
    const crack = craquelure(p)
    const leaf = mx_noise_float(p.mul(300).add(9)).mul(0.5).add(0.5)
    const pooling = mx_noise_float(p.mul(3.2).add(2)).mul(0.5).add(0.5)
    const goldWidth = crack.gold
    const seamLift = crack.goldCore.mul(0.85).add(crack.hairCore.mul(-0.2))
    this.positionNode = positionGeometry.add(normalLocal.mul(seamLift.mul(0.006)))
    const glazeHeight = pooling.mul(0.3).add(leaf.mul(intimate).mul(0.12)).sub(goldWidth.mul(0.45)).add(crack.hairCore.mul(-0.2))
    this.normalNode = proceduralNormal(glazeHeight, 0.35).add(normalLocal.mul(goldWidth.mul(0.1))).normalize()
    const jade = mix(color('#a9c4b2'), color('#e6ece3'), pooling.pow(2))
    const porcelain = jade.mul(float(1).sub(crack.hair.mul(0.3)))
    const gold = mix(color('#8a5a10'), color('#ffe08a'), leaf.mul(0.75).add(0.25))
    this.colorNode = mix(porcelain, gold, goldWidth.clamp(0, 1))
    this.metalnessNode = goldWidth.mul(0.95)
    this.roughnessNode = float(0.14).add(crack.hair.mul(0.16)).sub(goldWidth.mul(0.02)).add(leaf.mul(intimate).mul(0.14).mul(goldWidth))
    this.clearcoat = 1
    this.clearcoatRoughnessNode = float(0.04).add(crack.hair.mul(0.1))
    this.aoNode = crack.hair.mul(0.35).oneMinus().mul(goldWidth.mul(0.12).add(0.88))
    this.envMapIntensity = 1
    const goldGlint = glints(normalLocal, 90).mul(goldWidth).mul(near.mul(0.6).add(0.4))
    const leafGlint = glints(normalLocal.add(leaf.sub(0.5).mul(0.6)), 160).mul(goldWidth).mul(intimate).mul(leaf.smoothstep(0.7, 0.85))
    this.emissiveNode = color('#ffd98a').mul(grazing.pow(3).mul(goldWidth).mul(0.1)).add(gold.mul(goldGlint.mul(0.6))).add(color('#fff3cc').mul(leafGlint))
  }
}
