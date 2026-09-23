import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, time, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cellularPoints} from '../../lib/cellularPoints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Black opal. Large grains keep a single spectrum banked until the view aligns, then open it across the whole patch.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.32)
    this.name = knotData.id
    const {p, view, facing, grazing, cameraLocal, objectDistance} = viewerFrame()
    const proximity = objectDistance.smoothstep(1.5, 4.6).oneMinus()
    const orbit = cameraLocal.x.atan(cameraLocal.z)
    const milk = mx_noise_float(p.mul(2.4)).mul(0.5).add(0.5)
    const q = p.mul(3.3)
    const rnd = cellNoiseVec3(q.floor())
    const rnd2 = cellNoiseVec3(q.floor().add(vec3(5.2, 1.7, 8.4)))
    const dist = q.fract().sub(rnd.mul(0.42).add(0.29)).length()
    const reach = rnd.z.mul(0.18).add(0.46)
    const patch = dist.smoothstep(reach.mul(0.28), reach).oneMinus()
    const axis = rnd2.sub(0.5)
    const align = axis.dot(view).div(axis.length().max(0.2))
    const breath = time.mul(0.7).add(rnd.x.mul(TAU)).sin().mul(0.06)
    const active = align.smoothstep(float(0.02).add(breath), float(0.7).add(breath))
    const hue = rnd.y.mul(TAU).add(align.mul(2.1)).add(orbit).add(facing.mul(0.4))
    const fire = spectralColor(hue)
    const veins = opticalBands(p.dot(axis).mul(6.5).add(align.mul(3)).add(rnd.x.mul(2)))
    const core = veins.smoothstep(0.48, 0.92)
    const fireMask = active.mul(patch)
    const potch = mix(color('#07060b'), color('#3a3548'), facing.pow(0.7).mul(0.42).add(milk.mul(0.1)))
    this.colorNode = mix(potch, fire, fireMask.mul(0.92))
    this.metalness = 0
    this.roughnessNode = float(0.28).sub(fireMask.mul(0.14)).clamp(0.08, 0.4)
    this.clearcoat = 0.72
    this.clearcoatRoughness = 0.06
    this.ior = 1.45
    this.sheenNode = color('#c9d7f2').mul(grazing.pow(1.6)).mul(fireMask.oneMinus()).mul(0.16)
    this.sheenRoughness = 0.5
    const pinScale = p.mul(40)
    const pinFade = pinScale.fwidth().length().smoothstep(0.48, 0.16).oneMinus()
    const pins = cellularPoints(pinScale, 0.02, 0.08, 0.74)
    const pinHue = cellNoiseVec3(pinScale.floor()).x.mul(TAU).add(orbit).add(align.mul(1.4))
    this.emissiveNode = fire.mul(fireMask).mul(1.15).add(fire.mul(fireMask).mul(core).mul(2.4))
      .add(spectralColor(pinHue).mul(pins).mul(pinFade).mul(proximity).mul(fireMask.mul(0.65).add(0.35)).mul(2.2))
    this.normalNode = proceduralNormal(patch.mul(0.55).add(milk).add(core.mul(active)), 0.016)
    this.positionNode = p.add(normalLocal.mul(milk.sub(0.5).mul(0.007).add(patch.mul(0.004))))
  }
}
