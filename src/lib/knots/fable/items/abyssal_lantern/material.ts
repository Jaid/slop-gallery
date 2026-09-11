import type {Texture} from 'three/webgpu'

import {color, mix, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import mx_cell_noise_vec3 from '#src/lib/knots/cellNoise.ts'
import {opticalLine, proceduralNormal} from '#src/lib/knots/shared.ts'

import KnotMaterial from '../../../base/KnotMaterial.ts'
import {viewerFrame} from '../../helpers.ts'
import knotData from './data.ts'

export default class AbyssalLanternMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment)
    this.name = knotData.id
    // Velvet deep-sea skin studded with photophores. From across the room they drift in a slow sleepy pulse
    // step closer and the creature notices you: waves of light race outward from the point nearest to you,
    // the organs brighten, and some blush from cyan to gold. Photophores are lensed, brightest when faced.
    this.envMapIntensity = 0.4
    const {p, facing, rim, distance} = viewerFrame()
    const tube = uv()
    const rows = 6
    const cols = 44
    const rowId = tube.y.mul(rows).floor()
    const column = tube.x.mul(cols).add(rowId.mod(2).mul(0.5))
    const cell = vec3(column.floor().add(0.5), rowId.add(0.5), 0.5)
    const rnd = mx_cell_noise_vec3(cell)
    const local = vec2(column.fract().sub(0.5), tube.y.mul(rows).fract().sub(0.5))
    const radius = local.length()
    const lens = radius.smoothstep(0.1, 0.27).oneMinus()
    const core = radius.smoothstep(0, 0.11).oneMinus()
    const arousal = distance.smoothstep(0.9, 4).oneMinus()
    const wave = distance.mul(9).sub(time.mul(3)).sin().mul(0.5).add(0.5)
    const pulse = time.mul(rnd.x.mul(0.8).add(0.5)).add(rnd.y.mul(6.2832)).sin().mul(0.5).add(0.5).pow(2.5)
    const intensity = pulse.mul(0.12).add(arousal.mul(pulse.mul(0.55).add(0.45)).mul(wave.mul(0.65).add(0.35)))
    const lantern = mix(mix(color('#1f9dff'), color('#78fff0'), rnd.z), color('#ffd88a'), arousal.pow(3).mul(rnd.z).mul(0.8))
    const directional = facing.pow(0.8).mul(0.7).add(0.3)
    const veins = opticalLine(mx_noise_float(p.mul(9).add(time.mul(0.05))), 0.035)
    const skinNoise = mx_noise_float(p.mul(6)).mul(0.5).add(0.5)
    this.colorNode = mix(color('#02050b'), color('#0a1b36'), skinNoise).add(color('#0b2a4a').mul(lens).mul(0.6))
    this.metalness = 0
    this.roughness = 0.72
    this.sheen = 1
    this.sheenNode = color('#2f6a9e').mul(0.9)
    this.sheenRoughness = 0.55
    this.clearcoat = 0.18
    this.clearcoatRoughness = 0.35
    this.normalNode = proceduralNormal(mx_noise_float(p.mul(18)).mul(0.5).add(lens), 0.0012)
    this.emissiveNode = lantern.mul(lens.mul(0.6).add(core.mul(1.4))).mul(intensity).mul(directional).mul(2.2).add(color('#1e6fff').mul(veins).mul(arousal.mul(0.7).add(0.08)).mul(0.5)).add(color('#0c3a6e').mul(rim).mul(arousal.mul(0.6).add(0.25)))
  }
}
