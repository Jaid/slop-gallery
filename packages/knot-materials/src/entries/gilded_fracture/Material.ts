import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, time, uv} from 'three/tsl'

import {crackNetwork} from '../../candidates/deepseek/lib/crackNetwork.ts'
import {pixelFootprint} from '../../candidates/deepseek/lib/pixelFootprint.ts'
import {surfaceLine} from '../../candidates/deepseek/lib/surfaceLine.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Celadon porcelain, broken once and sewn with gold. The glaze is an even celadon with its own fine crazing, thin enough to let daylight through at grazing angles; under it the shards stay visibly separate. Every seam is filled: the metal sits a fraction of a millimeter below the glaze, keeps a chipped lip of ceramic along its edges, takes its color from the light – dull ochre in the shade, molten honey where the studio catches it – and a slow warm pulse keeps travelling the length of the veins, as if the gold were still settling.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const tube = uv()
    const p = viewerFrame().p
    const {facing, grazing, near, intimate} = viewerFrame()
    const t = time
    const pixel = pixelFootprint()
    const plates = crackNetwork(p, 11, 3.4, 0.45)
// The seams breathe: gold settles into them at the pace of a slow tide.
    const settle = t.mul(Math.PI).sin().mul(0.5).add(0.5)
    const veinPulse = tube.x.mul(Math.PI * 4).sub(t.mul(Math.PI)).sin().mul(0.5).add(0.5)
    const seam = surfaceLine(plates.edge, float(0.02).add(settle.mul(0.013)), pixel.mul(11))
// Gold never fills a crack completely: chips of glaze bite into its edges.
    const bite = mx_fractal_noise_float(p.mul(46), 2, 2.1, 0.5).mul(0.5).add(0.5)
    const goldBody = seam.coverage.mul(seam.energy.pow(0.5)).mul(bite.smoothstep(0.26, 0.44).mul(0.5).add(0.55))
    const shoulder = seam.coverage.mul(goldBody.oneMinus())
    const kiln = mx_noise_float(p.mul(3.4)).mul(0.5).add(0.5)
    const glaze = mix(color('#0a3b30'), color('#25725e'), mx_noise_float(p.mul(7)).mul(0.5).add(0.45))
    const glazeLit = mix(glaze, color('#5fa88f'), kiln.mul(0.2)).mul(mx_noise_float(p.mul(11)).mul(0.18).add(0.95))
// The recess is dark, the shoulder carries the shadow of the inlay, the metal runs bright between.
    this.colorNode = mix(glazeLit, color('#0a1412'), shoulder.mul(0.8)).add(color('#e0a63c').mul(goldBody))
    const crazing = mx_noise_float(p.mul(90)).abs().mul(-1).add(1).pow(22).mul(near)
    const relief = goldBody.mul(1.2).add(shoulder.mul(0.5)).sub(crazing.mul(0.25)).add(mx_noise_float(p.mul(5.5)).mul(0.2))
    this.normalNode = proceduralNormal(relief, float(0.0032).mul(seam.relief.mul(0.6).add(0.4)))
    const goldFacing = facing.pow(2.2)
    this.metalnessNode = goldBody.mul(0.95)
    this.roughnessNode = mix(float(0.3), mix(float(0.34), float(0.11), goldFacing), goldBody).add(mx_noise_float(p.mul(9)).mul(0.03))
    this.specularColorNode = mix(color('#c8dcd0'), color('#ffe8b0'), goldBody)
    this.specularIntensityNode = mix(float(0.75), float(1), goldBody)
    this.clearcoat = 0.45
    this.clearcoatRoughness = 0.09
    this.aoNode = goldBody.mul(-0.6).sub(shoulder.mul(0.25)).add(1)
// Porcelain is thin: at grazing angles daylight comes through it and warms the glaze.
    const translucency = grazing.pow(2.4).mul(0.55)
    const goldHeat = goldBody.mul(near.mul(0.55).add(0.12)).mul(float(0.72).add(t.mul(Math.PI).sin().mul(0.28)))
    this.emissiveNode = color('#ffcf7a').mul(goldBody).mul(goldFacing.mul(0.6).add(0.15)).mul(0.85)
      .add(color('#ffcf7a').mul(goldBody).mul(veinPulse.mul(1.1).add(0.1)).mul(0.85))
      .add(color('#ffeccb').mul(translucency).mul(0.4))
      .add(color('#ff9a3c').mul(goldHeat).mul(0.45))
      .add(color('#fff0d0').mul(crazing).mul(near).mul(0.05))
      .add(color('#ffcf8a').mul(goldHeat).mul(intimate).mul(0.15))
  }
}
