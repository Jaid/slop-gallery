import {bumpMap, color, float, max, mix, mx_noise_float, mx_worley_noise_vec2, normalGeometry, positionGeometry, smoothstep, time, uniform, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import fireColor from './fireColor.ts'

/**
 * A burning log for a `LogGeometry` lying on its side, turned by 90° around z so its y axis runs along the log.
 *
 * The log is charred into alligator checks stretched along the grain, with a dull silvery sheen; only a few patches of bark survive on its cool outer flank. Where it faces the flames or the coal bed below, the checks glow orange from within and pulse as the flames lick past. The glow fades toward the sawn ends, which show growth rings inside a charred rim.
 *
 * `inward` is the direction toward the fire along the log’s local z axis. It and the log’s size are uniforms, so all logs share one shader.
 */
export default class CharredLogMaterial extends MeshStandardNodeMaterial {
  constructor(inward: -1 | 0 | 1, halfLength: number, radius: number) {
    super({
      roughness: 0.7,
      envMapIntensity: 0.15,
    })
    this.name = 'lodge-charred-log'
    const p = positionGeometry
    const n = normalGeometry
    // Turned by 90° around z, the log’s local −x points down toward the embers.
    const facing = n.z.mul(uniform(inward))
    const downward = n.x.negate()
    const along = p.y.abs().div(uniform(halfLength))
    // Ragged, so the glowing zone never ends in a straight line along the log.
    const ragged = mx_noise_float(p.mul(vec3(14, 3, 14))).mul(0.35)
    const exposure = max(smoothstep(-0.2, 0.8, facing.add(ragged)), smoothstep(0, 0.9, downward.add(ragged)).mul(0.75)).mul(smoothstep(0.6, 0.97, along.add(ragged.mul(0.3))).oneMinus())
    // Stretched along the grain, the way charcoal checks.
    const warp = mx_noise_float(p.mul(vec3(6, 1.5, 6))).mul(0.06)
    const cells = mx_worley_noise_vec2(p.add(warp).mul(vec3(30, 4, 30)))
    const border = cells.y.sub(cells.x)
    const crack = smoothstep(0.015, 0.1, border).oneMinus()
    // White-hot deep in the checks, cooling to red on their lips.
    const depth = smoothstep(0, 0.035, border).oneMinus()
    const pulse = mx_noise_float(vec3(p.y.mul(4), time.mul(0.8), uniform(inward * 3 + 5))).mul(0.5).add(0.5)
    const glow = crack.mul(0.55).add(depth.mul(0.45)).mul(exposure.pow(1.3)).mul(pulse.mul(0.8).add(0.4)).add(exposure.pow(4).mul(pulse).mul(0.12))
    const patches = mx_noise_float(p.mul(vec3(7, 2.5, 7)))
    const bark = smoothstep(0.55, 0.85, facing.add(patches.mul(0.5)).negate()).mul(smoothstep(-0.1, 0.3, downward.negate()))
    const barkColor = mix(color('#3b2618'), color('#22160e'), mx_noise_float(p.mul(vec3(30, 3, 30))).mul(0.5).add(0.5))
    const charColor = mix(color('#2b2622'), color('#070504'), crack)
    // A little ash dusts the top, away from the hottest checks.
    const ash = smoothstep(0.4, 0.9, n.x).mul(smoothstep(0.15, 0.7, mx_noise_float(p.mul(14)))).mul(bark.oneMinus()).mul(crack.oneMinus()).mul(0.45)
    const side = mix(mix(charColor, barkColor, bark), color('#4d4843'), ash)
    // Sawn ends: growth rings around the pith, charred from the rim inward.
    const radiusNode = uniform(radius)
    const across = p.xz.length().div(radiusNode)
    const rings = across.mul(radiusNode.mul(220)).add(mx_noise_float(p.mul(9)).mul(2.5)).sin().mul(0.5).add(0.5)
    const sawn = mix(mix(color('#4a3322'), color('#2f2015'), rings), color('#0b0806'), smoothstep(0.55, 0.9, across))
    const end = smoothstep(0.6, 0.85, n.y.abs())
    this.colorNode = mix(side, sawn, end)
    this.roughnessNode = mix(mix(float(0.86), float(0.97), max(crack, bark)), float(0.9), end)
    this.emissiveNode = fireColor(glow.mul(end.oneMinus())).mul(2.6)
    this.normalNode = bumpMap(crack.oneMinus().mul(end.oneMinus()), float(0.05))
  }
}
