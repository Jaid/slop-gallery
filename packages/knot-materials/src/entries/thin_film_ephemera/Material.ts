import type {Texture} from 'three/webgpu'

import {max, mix, mx_fractal_noise_float, normalWorld, time, vec3} from 'three/tsl'

import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {cosinePalette} from '../../lib/cosinePalette.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** A soap film a few hundred nanometres thick: tension writes its swirls, gravity drains them, and it is one breath from nothing. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {p, grazing, near} = viewerFrame()
// Gravity drains the film downward: the crown thins towards nothing while the belly keeps its colours.
    const drainage = normalWorld.y.mul(0.5).add(0.5).oneMinus()
// Marangoni: surface tension dragging swirls of thicker film around the bubble.
    const swirl = mx_fractal_noise_float(p.mul(3.1).add(vec3(time.mul(0.02), time.mul(-0.05), 0)), 3, 2.1, 0.5)
      .add(mx_fractal_noise_float(p.mul(9.4).add(vec3(0, time.mul(0.04), 0)), 2, 2.2, 0.5).mul(0.4))
    const rivulet = mx_fractal_noise_float(p.mul(vec3(9, 1.6, 9)), 2, 2.1, 0.5)
    const thickness = drainage.mul(0.9).add(swirl.mul(0.2)).add(rivulet.mul(0.05)).add(0.1).clamp(0, 1.2)
// Plateau borders: the dark walls that divide the drifting cells of a real film.
    const border = cellularBoundary(p.mul(11).add(vec3(time.mul(0.03), time.mul(-0.06), time.mul(0.02)))).smoothstep(0, 0.11)
    const cells = cellularBoundary(p.mul(5.4).add(vec3(time.mul(-0.02), time.mul(-0.03), 0))).smoothstep(0, 0.19)
    const wall = max(border.mul(0.75), cells.mul(0.3))
// Interference: the colour a film this thin actually throws.
    const order = thickness.mul(7.5).add(swirl.mul(0.1))
    const spectrum = cosinePalette(order, [0.5, 0.46, 0.52], [0.5, 0.46, 0.44], [1, 1, 1], [0.02, 0.28, 0.54])
    const thin = thickness.smoothstep(0.02, 0.085)
    const silver = mix(spectrum, vec3(0.74, 0.77, 0.84), thickness.smoothstep(0.5, 1.05).mul(0.75))
    const soap = mix(silver.mul(thin), vec3(0.01, 0.012, 0.02), wall.mul(0.7))
// The film is a mirror first and a colour second; the room does the rest.
    this.colorNode = soap.mul(0.55)
    this.metalness = 0
    this.roughnessNode = wall.mul(0.16).add(thickness.mul(0.01)).add(0.006).clamp(0.004, 0.3)
    this.ior = 1.33
    this.clearcoat = 0.7
    this.clearcoatRoughness = 0.02
    const ripple = mx_fractal_noise_float(p.mul(34).add(vec3(0, time.mul(0.3), 0)), 2, 2.2, 0.5)
    this.normalNode = proceduralNormal(ripple.mul(0.03).add(thickness.mul(0.07)), 0.05)
    this.clearcoatNormalNode = proceduralNormal(ripple.mul(0.04), 0.05)
    this.iridescence = 1
    this.iridescenceIOR = 1.33
    this.iridescenceThicknessNode = thickness.mul(430).add(140).add(wall.mul(260))
    const glancing = grazing.mul(grazing)
    this.emissiveNode = spectrum.mul(thin.oneMinus().mul(0.5).add(0.5))
      .mul(glancing.mul(0.7).add(0.3))
      .mul(0.2)
      .add(vec3(0.8, 0.85, 1).mul(wall).mul(glancing).mul(near.mul(0.4).add(0.2)).mul(0.05))
  }
}
