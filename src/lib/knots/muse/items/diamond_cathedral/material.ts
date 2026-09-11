import type {Texture} from 'three/webgpu'

import {color, mx_noise_float, normalViewGeometry, normalWorld, reflectVector, time} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {glints, opticalLine, proceduralNormal, spectralColor, starfield, viewerFrame} from '../../helpers.ts'
import knotData from './data.ts'

export default class DiamondCathedralMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, view, facing, grazing, rim, near} = viewerFrame()
    this.envMapIntensity = 1.6
    const lensed = reflectVector.add(normalWorld.mul(grazing.pow(2).mul(0.6))).normalize()
    const sparkle = starfield(lensed, 32, 0.92)
    const fireHue = mx_noise_float(p.mul(7)).mul(7).add(view.x.mul(9)).add(view.y.mul(7)).add(grazing.mul(8)).add(time.mul(0.08))
    const fire = spectralColor(fireHue)
    const facet = mx_noise_float(p.mul(28)).mul(0.5).add(0.5)
    const caustic = opticalLine(mx_noise_float(p.mul(12).add(view.mul(1.5))).mul(9).sin(), 0.07)
    const glintSharp = glints(normalViewGeometry.normalize(), 120)
    const glintSoft = glints(normalViewGeometry.normalize(), 24)
    this.colorNode = color('#f4fbff')
    this.metalness = 0
    this.roughness = 0
    this.transmission = 1
    this.thickness = 0.35
    this.ior = 2.35
    this.dispersion = 0.9
    this.clearcoat = 1
    this.clearcoatRoughness = 0
    this.iridescence = 0.35
    this.iridescenceIOR = 1.8
    this.iridescenceThicknessNode = facing.mul(250).add(150)
    this.normalNode = proceduralNormal(facet.mul(0.15), 0.0006)
    this.emissiveNode = fire.mul(caustic).mul(grazing.pow(2).mul(1.2).add(0.15)).mul(1.6).add(fire.mul(glintSharp).mul(2.8)).add(color('#ffffff').mul(glintSoft).mul(0.5)).add(sparkle.mul(0.9).mul(near.mul(0.5).add(0.7))).add(color('#aee6ff').mul(rim).mul(0.18))
  }
}
