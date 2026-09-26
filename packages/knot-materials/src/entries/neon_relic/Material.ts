import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalView, smoothstep, time, uv, vec3} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * A neon tube bent into a knot. The wall is black soda-lime glass, so the piece is really a line of
 * light: brightest where the eye looks through the most gas, with a white-hot filament down the very
 * centre of the column and the last of the glow eaten by the wall at the silhouette. Walk around it
 * and the far arc of the tube dims while the near arc ignites; lean in and the mercury striations,
 * the two electrodes and the buzz on the glass all come forward.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.32)
    this.name = knotData.id
    const tube = uv()
    const {facing, grazing, near, intimate} = viewerFrame()
// The column: how much glowing gas the eye looks through, and the hot filament down its axis.
    const column = facing.pow(4)
    const filament = facing.pow(26)
// Electrodes: the two ends where the discharge is anchored, one hot and one failing.
    const cathode = tube.x.sub(0.06).abs().smoothstep(0.05, 0)
    const anode = tube.x.sub(0.58).abs().smoothstep(0.04, 0)
// Striations: mercury drops leave a fine unsteady grain along the column.
    const striation = mx_noise_float(vec3(tube.x.mul(26), tube.y.mul(3), time.mul(0.4))).mul(0.35).add(0.82)
    const buzz = time.mul(9.3).sin().mul(0.05).add(time.mul(2.1).sin().mul(0.07)).add(1).mul(striation)
// Two rare gases, mixed along the tube, and a seam of old sodium where the tube was repaired.
    const gas = mix(color('#ff1f6b'), color('#25d8ff'), smoothstep(0.3, 0.76, tube.x))
    const sodium = smoothstep(0.9, 1.02, tube.x).add(smoothstep(0.09, 0, tube.x).mul(0.6))
    const light = mix(gas, color('#ffa32a'), sodium.clamp(0, 1))
// The wall: polished by fire, black to a millimetre, with a cold edge where the light leaves it.
    this.colorNode = color('#050508')
    this.metalness = 0
    this.roughnessNode = float(0.03).add(grazing.mul(0.05)).add(mx_noise_float(vec3(tube.x.mul(40), tube.y.mul(2), 3.1)).abs().mul(0.02))
    this.ior = 1.52
    this.clearcoat = 0.4
    this.clearcoatRoughness = 0.02
    this.emissiveNode = light.mul(column.mul(7.5).add(0.02)).mul(buzz).mul(mix(float(1), float(0.34), facing.oneMinus().pow(1.5)))
      .add(light.mul(filament).mul(5).mul(buzz))
      .add(light.mul(cathode.add(anode.mul(0.7))).mul(1.1).mul(buzz))
      .add(light.mul(color('#ffe8f4')).mul(glints(normalView, 80)).mul(0.08))
      .add(color('#8fe8ff').mul(grazing.pow(3.5)).mul(0.04))
      .add(light.mul(0.03).mul(near.mul(0.5).add(0.5)))
      .add(color('#ffffff').mul(intimate.mul(0.004)))
  }
}
