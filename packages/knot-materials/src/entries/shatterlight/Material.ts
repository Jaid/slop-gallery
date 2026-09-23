import type {Node, Texture} from 'three/webgpu'

import {bitangentView, color, float, mix, mx_cell_noise_float, mx_noise_float, normalViewGeometry, positionViewDirection, tangentView, vec3} from 'three/tsl'

import {glitter} from '../../candidates/deepseek/lib/glitter.ts'
import {loopWave} from '../../candidates/deepseek/lib/loopClock.ts'
import {studioLightsView} from '../../candidates/deepseek/lib/studioLights.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Mirror shards bound in gold. Every Voronoi cell is a flat facet with its own tilt, so each shard reflects a different part of the gallery and the knot keeps rearranging the room as you walk. The facets sway on their own phase, the seams are polished gold with a dark gap at their core, and up close each shard resolves into a second generation of crushed facets. Pinpoint flashes come from the real studio lamps, not from an invented light rig.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.72)
    this.name = knotData.id
    const {p, grazing, intimate} = viewerFrame()
    const scale = p.mul(10)
    const seam = cellularBoundary(scale)
    const filter = seam.fwidth().mul(0.7)
    const cell = scale.floor()
    const rnd = cellNoiseVec3(cell)
    const identity = mx_cell_noise_float(cell.add(11.3))
    const sway = loopWave(1, identity.mul(TAU).add(p.dot(vec3(3.1, 1.7, -2.3)))).mul(0.7)
    const angle = rnd.z.mul(TAU).add(sway)
    const tilt = tangentView.mul(angle.cos()).add(vec3(bitangentView as unknown as Node<'vec3'>).mul(angle.sin())).mul(rnd.x.mul(0.2).add(0.09))
    const facet = normalViewGeometry.add(tilt).normalize()
    const fineRnd = cellNoiseVec3(cell.mul(3).add(vec3(5.5, 2.5, 8.5)))
    const fineAngle = fineRnd.z.mul(TAU).add(loopWave(1, fineRnd.y.mul(TAU).add(p.dot(vec3(-2.2, 3.3, 1.4)))).mul(0.6))
    const fineTilt = tangentView.mul(fineAngle.cos()).add(vec3(bitangentView as unknown as Node<'vec3'>).mul(fineAngle.sin())).mul(fineRnd.x.mul(0.14).add(0.04)).mul(intimate.mul(0.75))
    const shard = facet.add(fineTilt).normalize()
    const gapMask = seam.add(filter).smoothstep(-0.004, 0.012).oneMinus()
    const goldMask = seam.add(filter).smoothstep(0.012, 0.05).oneMinus()
    const chasing = mx_noise_float(vec3(seam.mul(420), rnd.y.mul(37), rnd.z.mul(37))).mul(0.5).add(0.5)
    const speck = glitter(p, 0.0062, 64, 0.7)
    let flash: Node<'float'> = float(0)
    for (const lamp of studioLightsView) {
      const half = lamp.add(positionViewDirection).normalize()
      flash = flash.add(shard.dot(half).clamp().pow(150))
    }
    const mirror = mix(color('#b3bed1'), color('#e4ebf7'), rnd.y.mul(0.55).add(0.25))
    const bead = seam.add(filter).smoothstep(0.012, 0.038).oneMinus()
    const relief = bead.mul(0.02).add(chasing.mul(0.012)).add(speck.resolved.mul(0.004))
    this.colorNode = mix(mix(mirror, color('#ffc768'), goldMask), color('#0b1030'), gapMask.mul(goldMask.oneMinus().mul(0.8).add(goldMask.mul(0.55))))
    this.metalness = 1
    this.roughnessNode = mix(float(0.045), float(0.26), goldMask.mul(0.85)).add(chasing.mul(0.04)).add(speck.sparkle.mul(0.02)).clamp(0.03, 0.4)
    this.normalNode = proceduralNormal(relief, 0.0006).add(speck.lean.mul(0.12)).normalize()
    this.iridescence = 0.34
    this.iridescenceThicknessNode = rnd.z.mul(430).add(190)
    this.emissiveNode = color('#ffe6b4').mul(flash.mul(1))
      .add(color('#ffd08a').mul(goldMask.mul(chasing.mul(0.6).add(0.5)).mul(grazing.pow(2)).mul(0.42)))
      .add(color('#dfe9ff').mul(speck.sparkle).mul(intimate).mul(0.55))
      .add(color('#8fb4ff').mul(grazing.pow(7)).mul(0.06))
  }
}
