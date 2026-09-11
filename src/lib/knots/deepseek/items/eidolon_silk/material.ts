import type {Node, Texture} from 'three/webgpu'

import {bitangentView, color, mix, positionViewDirection, tangentView, uv, vec3} from 'three/tsl'

import {KnotMaterial} from '../../../base/KnotMaterial.ts'
import {liquidNormal, opticalLine, viewerFrame} from '../../flashHelpers.ts'
import knotData from './data.ts'

export default class EidolonSilkMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 0.8
    const {rim, near, intimate} = viewerFrame()
    const tube = uv()
    const thread = opticalLine(tube.x.mul(80).fract().sub(0.5), 0.06)
    const weave = opticalLine(tube.y.mul(36).fract().sub(0.5), 0.07)
    const fine = opticalLine(tube.x.mul(320).add(tube.y.mul(12)).fract().sub(0.5), 0.04).mul(intimate)
    const silkMask = thread.max(weave).add(fine.mul(0.5)).clamp()
    const tangent = tangentView.normalize()
    const bitangent = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
    const aniso = tangent.dot(positionViewDirection).abs().pow(6).add(bitangent.dot(positionViewDirection).abs().pow(6)).mul(0.5)
    const silkColor = mix(color('#0a0a1a'), color('#c0c8ff'), silkMask.mul(0.5).add(0.2))
    this.colorNode = silkColor
    this.transmission = 0.5
    this.thickness = 0.3
    this.ior = 1.4
    this.attenuationColor.set('#3a2a5a')
    this.attenuationDistance = 0.7
    this.roughnessNode = silkMask.mul(0.25).add(0.1)
    this.metalness = 0.1
    this.clearcoat = 1
    this.clearcoatRoughness = 0.05
    this.anisotropyNode = aniso.mul(0.8)
    this.sheen = 1
    this.sheenRoughness = 0.25
    this.normalNode = liquidNormal(near, 0.06)
    this.emissiveNode = color('#c0c8ff').mul(aniso).mul(near.mul(0.6).add(0.4)).add(color('#9d7dff').mul(silkMask).mul(0.4)).add(color('#ffffff').mul(rim).mul(0.15))
  }
}
