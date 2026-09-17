import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv} from 'three/tsl'

import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalLine} from '../../lib/opticalLine.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
/**
             * 6. QUANTUM DAMASCUS
             * Legendary folded Wootz steel etched with acid to reveal organic damascus grain.
             * Integrated with room-temperature superconducting Meissner ribbons that channel
             * relativistic Cherenkov cyan and quantum violet magnetic flux pulses along seamless tangents.
             */
    const {p, rim, near, intimate} = viewerFrame()
    const tube = uv()
    // Acid-etched folded rose & ladder pattern
    const foldWarp = mx_noise_float(p.mul(4.5)).mul(2.4)
    const grain = p.x.mul(16).add(p.y.mul(10)).add(foldWarp)
    const damascusBands = grain.mul(Math.PI * 3).sin().mul(0.5).add(0.5).pow(1.8)
    // Meissner superconducting flux channels
    const flux1 = opticalLine(tube.y.mul(6).add(tube.x.mul(24)).fract().sub(0.5), 0.04)
    const flux2 = opticalLine(tube.y.mul(-4).add(tube.x.mul(48)).fract().sub(0.5), 0.035).mul(intimate)
    const fluxMask = flux1.max(flux2)
    // Relativistic quantum flux packets surging down the channels
    const packet = tube.x.mul(36).sub(time.mul(3.5)).sin().mul(0.5).add(0.5).pow(6)
    const fluxColor = mix(color('#00f0ff'), color('#8a2be2'), packet)
    const darkSteel = color('#0f1114')
    const brightSteel = color('#dce4ed')
    const baseSteel = mix(darkSteel, brightSteel, damascusBands)
    this.colorNode = baseSteel
    this.metalnessNode = mix(float(0.92), float(0.98), damascusBands)
    this.roughnessNode = mix(float(0.34), float(0.08), damascusBands).mix(float(0.02), fluxMask)
    this.anisotropy = 0.9
    this.anisotropyNode = float(0.9)
    this.clearcoat = 0.55
    this.clearcoatRoughness = 0.05
    this.normalNode = proceduralNormal(damascusBands.mul(0.32).add(fluxMask.mul(0.4)), 0.0016)
    const fluxRadiance = fluxColor.mul(fluxMask).mul(packet.mul(3.2).add(1.3))
    this.emissiveNode = fluxRadiance.mul(near.mul(0.6).add(0.5)).add(color('#0077ff').mul(damascusBands).mul(rim).mul(0.08))
  }
}
