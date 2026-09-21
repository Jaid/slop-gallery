import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, color, float, mix, mx_noise_float, mx_noise_vec3, normalLocal, normalViewGeometry, normalWorldGeometry, positionGeometry, positionWorld, time, uv, vec2, vec3} from 'three/tsl'

import {filteredRibbon} from '../../lib/filteredRibbon.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {drapeHarmonics, pileHarmonics, weave, wrinkleHarmonics} from './util.ts'

// The exhibition key light, in world space. The pile sheen is tied to it, not to the screen, so it
// sweeps across the folds as the viewer circles instead of sticking to the camera.
const keyLight = vec3(-3, 9, -16).normalize()
export default class VelvetNocturneMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
// ---------------------------------------------------------------
// Velvet. A silk pile standing on end: head on, almost every ray is
// swallowed by the fibres and the cloth reads as near black. At a
// grazing glance the pile tips light up along their length and the
// whole surface blooms into oxblood. The folds are real geometry, so
// the silhouette scallops, and the sheen slides across them as you
// walk. Gold thread is sewn along the highest crests only.
// ---------------------------------------------------------------
    const tube = uv()
    const u = tube.x
    const v = tube.y
    const {grazing, rim, near, intimate} = viewerFrame()
    const drape = weave(u, v, time, drapeHarmonics)
    const wrinkle = weave(u, v, time, wrinkleHarmonics)
    const pile = weave(u, v, time, pileHarmonics)
// Real folds: geometry moves, and the shading normal is the first
// order normal of exactly that displaced surface.
    const foldHeight: Node<'float'> = drape.value.mul(0.023).add(wrinkle.value.mul(0.0072))
    const pileHeight: Node<'float'> = pile.value.mul(0.0017).mul(near.mul(0.75).add(0.25))
    this.positionNode = positionGeometry.add(normalLocal.mul(foldHeight))
    this.normalNode = proceduralNormal(foldHeight.add(pileHeight), 1)
    const crest = drape.value.smoothstep(0.3, 0.95)
    const patina = mx_noise_float(u.mul(17).add(v.mul(5))).mul(0.5).add(0.5)
    const worn = mx_noise_float(u.mul(3.4).add(v.mul(2.1)).add(9.3)).mul(0.5).add(0.5)
// Head on the cloth is a tomb; the color only arrives as the pile tips
// turn edge-on and scatter the light back out again.
    const dye = mix(color('#240410'), color('#4a0a18'), worn.mul(0.6).add(0.1))
    const bloom = grazing.pow(1.05).add(crest.mul(0.07)).clamp()
    const clothColor: Node<'vec3'> = mix(dye, mix(color('#8c0f24'), color('#e8445a'), crest.mul(0.4).add(0.1)), bloom)
// Gold thread follows the crest of the drape and only where the cloth
// was embroidered at all, so the pattern reads as needlework.
    const ridgeField = filteredRibbon(drape.slopeU, 0.05)
    const threadGate = crest.pow(2).mul(mx_noise_float(u.mul(7).add(v.mul(3)).add(21.7)).mul(0.5).add(0.5).smoothstep(0.45, 0.8))
    const thread = ridgeField.mul(threadGate)
    const threadTwist = mx_noise_float(u.mul(220).add(v.mul(20))).mul(0.5).add(0.5)
    this.colorNode = mix(clothColor, mix(color('#b07a1e'), color('#fff2c4'), threadTwist), thread)
    this.metalnessNode = thread.mul(0.95)
    this.roughnessNode = mix(float(0.5).add(patina.mul(0.14)).sub(crest.mul(0.06)), float(0.32).add(threadTwist.mul(0.2)), thread)
    this.specularIntensityNode = float(0.3)
    this.sheenNode = mix(color('#d8283c'), color('#ffccd0'), crest.mul(0.35).add(0.25))
    this.sheenRoughnessNode = float(0.7).add(wrinkle.value.abs().mul(0.12))
// The nap leans around the tube, which is exactly the bitangent.
    this.anisotropyNode = vec2(0, mix(float(0.45), float(0.85), crest).mul(near.mul(0.3).add(0.7)))
// ---------------------------------------------------------------
// The pile sheen itself. A real Charlie lobe is far too narrow for a
// fibre forest, so the broad lobe of the exhibition key light is
// evaluated against the *world* normal: the crimson core of the sheen
// goes white-hot where the fibres stand almost edge-on.
// ---------------------------------------------------------------
    const toEye = cameraPosition.sub(positionWorld).normalize()
    const half = keyLight.add(toEye).normalize()
    const lobe = normalWorldGeometry.dot(half).clamp()
    const sheenLobe = lobe.pow(7).mul(0.62).add(lobe.pow(2.2).mul(0.38)).mul(grazing.pow(1.35).mul(0.7).add(0.3))
    const sheenTint = mix(color('#ff2440'), color('#fff2ee'), grazing.pow(2.2))
    const sheen = sheenTint.mul(sheenLobe).mul(2.3)
// Lint and dust caught in the pile, visible only once the fibres resolve.
    const lintNormal = normalViewGeometry.add(mx_noise_vec3(u.mul(900).add(v.mul(60))).mul(0.8)).normalize()
    const lint = glints(lintNormal, 120).mul(near).mul(0.5)
    const glow: Node<'vec3'> = sheen
      .add(color('#ffd7c2').mul(lint).mul(0.7))
      .add(color('#e0182e').mul(bloom.pow(2)).mul(rim).mul(0.16))
      .add(color('#ffcf8a').mul(thread).mul(grazing.pow(2)).mul(intimate.mul(0.4).add(0.12)))
    this.emissiveNode = glow
  }
}
