import {color, float, mix, mx_noise_float, positionGeometry, time, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal, line, visibleDetail} from './filters.ts'

/** Submerged jade tesserae with a brass-colored compass border. Procedural grout and moving caustic light need no image assets. */
export default class FountainBasinMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({roughness: 0.37})
    this.name = 'Jade fountain mosaic'
    const p = positionGeometry.xz
    const radius = p.length()
    const cells = p.div(0.065)
    const tileEdge = cells.fract().sub(0.5).abs()
    const edge = float(0.5).sub(tileEdge.x.max(tileEdge.y)).mul(0.065)
    const grout = line(edge, 0.0012)
    const tile = mx_noise_float(vec3(cells.floor(), float(1))).mul(0.5).add(0.5)
    const stone = mix(color('#245b52'), color('#5c8d79'), tile)
    const ring = line(radius.sub(1.48), 0.012).max(line(radius.sub(1.39), 0.006))
    const angle = p.y.atan(p.x.add(0.00001))
    const rays = angle.mul(8).cos().abs().pow(12).mul(radius.smoothstep(0.45, 0.58)).mul(radius.smoothstep(1.28, 1.36).oneMinus())
    const inlay = ring.max(rays.mul(0.55))
    const detail = visibleDetail(p.fwidth().length(), 0.065)
    this.colorNode = mix(mix(stone, color('#afc3a9'), grout.mul(detail)), color('#b8a66c'), inlay)
    // A bounded approximation of refracted light on the shallow floor, not a second lighting or render pass.
    const wave = mx_noise_float(vec3(p.mul(9).add(time.mul(0.18)), time.mul(0.22)))
    const caustic = wave.abs().smoothstep(0.025, 0.16).oneMinus().mul(visibleDetail(p.fwidth().length(), 0.1))
    this.colorNode = this.colorNode.mul(caustic.mul(0.22).add(1))
    this.normalNode = heightNormal(grout.mul(-0.0006).mul(detail))
  }
}
