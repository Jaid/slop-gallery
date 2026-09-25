import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, normalLocal, time, uv, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

function rootField(tube: Node<'vec2'>) {
  const q = tube.mul(vec2(22, 9))
  const warp = q.x.add(q.y.mul(3.1).sin().mul(0.6)).add(q.y.mul(1.7).cos().mul(0.25))
  const broad = warp.sin().mul(0.5).add(0.5)
  const rootField = q.x.mul(3.2).add(q.y.mul(0.7).sin().mul(0.35))
  const roots = rootField.sin().abs().smoothstep(0.06, 0.2).oneMinus()
  const fine = q.x.mul(7.4).add(q.y.mul(2.2).sin()).sin().abs().smoothstep(0.025, 0.12).oneMinus()
  const knots = cellNoiseVec3(vec3(q.x.floor(), q.y.floor(), 3.7))
  const spore = knots.x.smoothstep(0.69, 0.88).mul(fine.mul(0.6).add(0.4))
  return {
    q,
    broad,
    roots,
    fine,
    knots,
    spore,
  }
}

/**
 * A living stellar bestiary drawn from connected pinpricks of light.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.75)
    this.name = knotData.id
    const tube = uv()
    const {p, view, grazing, near, intimate} = viewerFrame()
    const field = rootField(tube)
    const pulse = time.mul(1.8).add(tube.x.mul(9.3).sin()).sin().mul(0.5).add(0.5)
    const direction = view.dot(vec3(0.5, -0.1, 0.85).normalize()).mul(0.5).add(0.5)
    const rootColor = mix(color('#63e89a'), color('#b9ffcf'), direction).mul(field.spore.mul(0.8).add(0.25))
    const membrane = mix(color('#061b18'), color('#0d4c4c'), field.broad.mul(0.36).add(0.2))
    const height = field.roots.mul(0.035).add(field.fine.mul(0.012)).add(field.spore.mul(0.018))
    this.positionNode = p.add(normalLocal.mul(height.mul(near.mul(0.55).add(0.45)).mul(0.0018)))
    this.colorNode = mix(membrane, rootColor, field.roots.mul(0.82).add(field.fine.mul(0.18)))
    this.metalness = 0.05
    this.roughnessNode = float(0.2).add(field.fine.mul(0.25)).sub(field.roots.mul(0.08)).clamp(0.1, 0.5)
    this.clearcoat = 0.9
    this.clearcoatRoughness = 0.08
    this.normalNode = proceduralNormal(height.mul(1.4), 0.0016)
    this.transmission = 0.08
    this.ior = 1.37
    const glimmer = field.roots.mul(field.spore).mul(pulse).mul(grazing.mul(0.6).add(0.4)).mul(intimate.mul(0.6).add(0.4))
    this.emissiveNode = rootColor.mul(glimmer.mul(1.35)).add(color('#d8ffe7').mul(field.fine.mul(near).mul(0.32)))
    this.aoNode = float(0.7).add(field.roots.mul(0.3))
  }
}
