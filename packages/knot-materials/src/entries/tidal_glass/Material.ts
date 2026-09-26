import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, normalViewGeometry, time, uv, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

function tideField(tube: Node<'vec2'>) {
  const q = tube.mul(vec2(30, 8))
  const cell = q.floor()
  const local = q.fract().sub(0.5)
  const random = cellNoiseVec3(vec3(cell.x.add(0.5), cell.y.add(0.5), 5.1))
  const radius = local.length()
  const shell = radius.smoothstep(0.22, 0.46).oneMinus()
  const ring = radius.sub(float(0.34).add(random.z.mul(0.045))).abs().smoothstep(0.008, 0.038).oneMinus()
  const glint = random.x.smoothstep(0.62, 0.8).mul(shell)
  return {
    cell,
    local,
    random,
    radius,
    shell,
    ring,
    glint,
  }
}

/** A living stellar bestiary drawn from connected pinpricks of light. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.25)
    this.name = knotData.id
    const tube = uv()
    const {p, view, grazing, near, intimate} = viewerFrame()
    const field = tideField(tube)
    const refractField = p.mul(8).add(vec3(0, time.mul(0.025), 0))
    const caustic = mx_noise_float(refractField).mul(0.5).add(0.5)
    const angle = view.dot(vec3(0.48, 0.36, 0.8).normalize()).mul(0.5).add(0.5)
    const water = mix(color('#0b3b54'), color('#1a9b9e'), caustic.mul(0.56).add(angle.mul(0.16))).add(color('#80e8d2').mul(field.ring).mul(0.12))
    const height = field.shell.mul(0.012).add(field.ring.mul(0.004))
    this.positionNode = p.add(normalLocal.mul(height.mul(near.mul(0.5).add(0.5)).mul(0.0016)))
    this.colorNode = water
    this.metalness = 0.04
    this.roughnessNode = float(0.055).add(field.ring.mul(0.2)).add(field.random.y.mul(0.035))
    this.transmission = 0.88
    this.thickness = 0.72
    this.ior = 1.46
    this.dispersion = 0.18
    this.attenuationColor.set('#4abbb4')
    this.attenuationDistance = 1.8
    this.clearcoat = 1
    this.clearcoatRoughnessNode = float(0.025).add(field.ring.mul(0.06))
    this.normalNode = proceduralNormal(height.add(caustic.mul(0.003)), 0.0011)
    this.iridescenceNode = angle.mul(0.48).add(field.ring.mul(0.25))
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessNode = angle.mul(310).add(110)
    const reflection = glints(normalViewGeometry, 75).mul(field.glint).mul(near)
    this.emissiveNode = color('#b8fff1').mul(field.ring.mul(grazing).mul(near).mul(0.28)).add(color('#d4ffff').mul(reflection.mul(0.75))).add(color('#176d9b').mul(field.shell.mul(caustic).mul(intimate).mul(0.08)))
    this.aoNode = float(0.8).add(field.ring.mul(0.2))
  }
}
