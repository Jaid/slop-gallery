import type {Node, Texture} from 'three/webgpu'

import {bitangentView, color, float, mix, mx_noise_float, normalViewGeometry, positionViewDirection, tangentView, time, uv, vec2, vec3} from 'three/tsl'

import {palette} from '../../candidates/grok/lib/palette.ts'
import {screenRibbon} from '../../candidates/grok/lib/screenRibbon.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {liquidNormal} from '../../lib/liquidNormal.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * Bounded tangent-space view slope in UV units. The knot’s unwrapped tube is about 7.2 long and 0.82 around; the facing floor stops grazing rays from leaping across tiles.
 */
function tubeSlope(depth = 1) {
  const view = positionViewDirection
  const facing = normalViewGeometry.dot(view).abs().max(0.22)
  const tangent = tangentView.normalize()
  const bitangent = vec3(bitangentView as unknown as Node<'vec3'>).normalize()
  return vec2(view.dot(tangent), view.dot(bitangent)).div(vec2(7.2, Math.PI * 0.26)).div(facing).mul(depth)
}
/**
 * Layered nacre. Each aragonite sheet sits at its own parallax depth, so the rainbow slides across the knot as the camera orbits. Growth lines stay put; only the interference and a slow tide move.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.2)
    this.name = knotData.id
    const {p, view, facing, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const slope = tubeSlope(1)
    const growth = screenRibbon(tube.y.mul(48).add(mx_noise_float(p.mul(5)).mul(0.8)).sin(), 0.28)
    const layers = 6
    let film: Node<'vec3'> = vec3(0)
    let cover: Node<'float'> = float(0)
    for (let index = 0;index < layers;index++) {
      const depth = 0.006 + index * 0.014
      const shifted = tube.sub(slope.mul(depth * 9))
      const along = shifted.x.mul(11 + index).add(shifted.y.mul(2.2)).add(index * 0.41)
      const ripple = mx_noise_float(vec3(shifted.mul(4.5), index * 1.7)).mul(1.3)
      const phase = along.add(ripple).add(time.mul(0.06 + index * 0.012)).add(view.dot(vec3(0.55, 0.25, 0.8)).mul(1.8))
      const sheet = phase.sin().smoothstep(-0.2, 0.85)
      const weight = sheet.pow(1.6).mul(1 - index * 0.1)
      const hue = spectralColor(phase.mul(0.7).add(index * 0.85).add(grazing.mul(2.2)))
      film = film.add(hue.mul(weight))
      cover = cover.add(weight)
    }
    film = film.div(cover.max(0.001))
    const pearl = palette(facing.mul(0.65).add(0.1), [{
      at: 0,
      hex: '#fff6ec',
    }, {
      at: 0.45,
      hex: '#e4d0be',
    }, {
      at: 1,
      hex: '#8d7384',
    }])
    const lip = mix(color('#fffaf3'), color('#f0c8ba'), tube.y.mul(3).fract())
    const colorBody = mix(pearl, film, float(0.72).add(grazing.mul(0.25)))
    const lined = mix(colorBody, lip, growth.mul(intimate.mul(0.55).add(0.18)))
    const organic = mx_noise_float(p.mul(16)).mul(0.5).add(0.5)
    this.colorNode = lined.mul(organic.mul(0.06).add(0.95))
    const relief = mx_noise_float(p.mul(4.2)).mul(0.012).add(tube.y.mul(40).sin().mul(0.003)).add(growth.mul(0.002))
    this.normalNode = proceduralNormal(relief, 1.05)
    this.clearcoatNormalNode = liquidNormal(intimate.mul(0.4).add(0.2), 0.45)
    this.metalnessNode = float(0.12).add(grazing.mul(0.18))
    this.roughnessNode = float(0.14).sub(facing.mul(0.06)).add(organic.mul(0.04)).clamp(0.04, 0.24)
    this.clearcoatNode = float(0.85).add(near.mul(0.12))
    this.clearcoatRoughnessNode = float(0.035).add(growth.mul(0.03))
    this.iridescence = 1
    this.iridescenceIORNode = float(1.18).add(grazing.mul(0.28))
    this.iridescenceThicknessNode = tube.x.mul(680).add(tube.y.mul(340)).add(view.y.mul(120)).add(180).abs()
    this.sheenNode = color('#fff6ee').mul(grazing.pow(1.7).mul(0.4))
    this.sheenRoughness = 0.36
    this.ior = 1.56
    this.transmissionNode = grazing.pow(1.6).mul(0.22)
    this.thickness = 0.09
    const tide = time.mul(0.22).add(p.dot(vec3(1.4, 0.3, -0.8))).sin().mul(0.5).add(0.5)
    this.emissiveNode = film.mul(grazing.pow(1.15)).mul(0.32).add(film.mul(facing).mul(0.05)).add(color('#fff8f2').mul(growth).mul(facing).mul(tide).mul(0.08))
  }
}
