import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, refract, vec3} from 'three/tsl'

import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** The studio's key light, in object space. */
const keyLight = vec3(-0.16, 0.48, -0.86).normalize()
/** Three rutile needle families, 60° apart in the corundum basal plane. */
const needleAxes = [vec3(1, 0, 0), vec3(0.5, 0.866, 0), vec3(-0.5, 0.866, 0)]
const corundum = 1.77
export default class Material extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
// ---------------------------------------------------------------------
// Asterism. A star sapphire is corundum shot through with rutile needles
// that grew along three crystallographic axes. Light bends as it enters
// the stone, and a ray only comes back to the eye if the needle it struck
// lies across the offset between the refracted view ray and the refracted
// light ray. That condition is met along three lines crossing at the
// highlight, so a six-rayed star hangs inside the stone and swings across
// its face as you walk around it.
// ---------------------------------------------------------------------
    const {p, view, grazing, near} = viewerFrame()
    const N = normalLocal.normalize()
    const H = view.add(keyLight).normalize()
    const viewIn = refract(view.negate(), N, 1 / corundum)
    const lightIn = refract(keyLight.negate(), N, 1 / corundum)
    const offset = viewIn.sub(lightIn)
    const spread = offset.length()
    let star: Node<'float'> = float(0)
    for (const axis of needleAxes) {
      star = star.add(offset.dot(axis).abs().div(spread.max(0.0001)).oneMinus().pow(30))
    }
// A knot's tube is only one surface wide, so the three needle families cannot
// draw a compact six-ray star the way a domed cabochon does. What survives is
// the chatoyant part of asterism: crossing silk bands that sweep across the
// stone, pinching into fan-shaped nodes where the families meet.
    const falloff = N.dot(H).smoothstep(-0.1, 0.55)
    const asterism = star.mul(falloff)
    const bodyNoise = mx_noise_float(p.mul(4.5)).mul(0.5).add(0.5)
    const body = mix(mix(color('#071034'), color('#16307e'), bodyNoise), color('#2a55c0'), bodyNoise.mul(0.4))
    this.colorNode = body.add(color('#7fa8ff').mul(asterism).mul(0.12))
    this.metalness = 0
    this.roughnessNode = float(0.03)
    this.transmission = 0.5
    this.thickness = 0.7
    this.ior = corundum
    this.attenuationColor.set('#0a1a5c')
    this.attenuationDistance = 0.4
    this.clearcoat = 0.35
    this.clearcoatRoughness = 0.015
    this.normalNode = proceduralNormal(bodyNoise.mul(0.05), 0.0003)
    this.clearcoatNormalNode = this.normalNode
    this.emissiveNode = color('#e2eeff').mul(asterism).mul(near.mul(0.25).add(0.75)).mul(2.4)
      .add(color('#1d3a90').mul(grazing.pow(3)).mul(0.08))
  }
}
