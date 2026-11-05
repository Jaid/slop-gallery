import {attribute, color, faceDirection, float, max, mix, mx_noise_float, positionGeometry, uv} from 'three/tsl'
import {DoubleSide, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal} from './filters.ts'

/**
 * Living leaves for the blades of `bladeGeometry`, which keep their painted vertex colors: the midrib sunk into a groove and secondary veins sweeping out toward the margin with the blade quilted between them. The upper face shines with a waxy cuticle, the underside is paler and matte, and a few tips and margins have dried brown.
 *
 * Laid out in the blade’s uv: across it from margin to margin and along it from stalk to tip.
 */
export default class LeafMaterial extends MeshPhysicalNodeMaterial {
  constructor({glossy = false}: {glossy?: boolean} = {}) {
    super({
      side: DoubleSide,
      roughness: 0.5,
      sheen: 0.35,
      sheenRoughness: 0.5,
    })
    this.name = 'Leaf'
    const painted = attribute<'vec3'>('color', 'vec3')
    const s = uv().x.mul(2).sub(1)
    const across = s.abs()
    const t = uv().y
    const front = faceDirection.greaterThan(0)
    const midrib = across.div(0.035).pow(2).negate().exp()
    // Secondary veins leave the midrib at a slant and curve toward the tip near the margin; where they get too fine to see, they fade to their average.
    const veinPhase = t.sub(across.mul(0.42)).sub(across.pow(3).mul(0.15)).mul(7)
    const veinOffset = veinPhase.add(0.5).fract().sub(0.5)
    const shown = veinPhase.fwidth().smoothstep(0.25, 0.08)
    const veins = veinOffset.div(0.07).pow(2).negate().exp().mul(across.smoothstep(0.03, 0.1)).mul(across.smoothstep(0.98, 0.85)).mul(shown)
    const quilt = veinOffset.mul(Math.PI).cos().pow(2).mul(float(1).sub(across.pow(4))).mul(shown)
    const relief = quilt.mul(0.0001).sub(midrib.mul(0.00025)).sub(veins.mul(0.00012))
    // Dried tips and margins, on some leaves more than on others.
    const drought = mx_noise_float(positionGeometry.mul(6)).mul(0.5).add(0.5)
    const dried = max(t.smoothstep(0.9, 1), across.smoothstep(0.94, 1).mul(0.6)).mul(drought.smoothstep(0.55, 0.8))
    let leaf = mix(painted, painted.mul(1.3).add(0.03), max(midrib, veins).mul(0.4))
    leaf = mix(leaf, color('#8a7a3c'), dried.mul(0.8))
    this.colorNode = front.select(leaf, mix(leaf, color('#a8b98b'), 0.3))
    this.roughnessNode = front.select(float(glossy ? 0.2 : 0.32).add(quilt.mul(0.06)), float(0.68)).add(dried.mul(0.25))
    this.clearcoatNode = front.select(float(glossy ? 0.5 : 0.25), float(0)).mul(dried.oneMinus())
    this.clearcoatRoughnessNode = float(0.22)
    this.sheenNode = color('#9ccf7a').mul(0.25)
    this.normalNode = heightNormal(relief)
  }
}
