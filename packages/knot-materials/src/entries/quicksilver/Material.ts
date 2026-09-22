import type {Texture} from 'three/webgpu'

import {color, float, mx_noise_float, normalLocal, normalViewGeometry, positionGeometry, time, vec3} from 'three/tsl'

import {beads} from '../../lib/beads.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {waves} from './lib/waves.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.05)
    this.name = knotData.id
// A knot cast in living mercury. Surface tension combs slow swells over the mirror; satellite droplets bead
// and tremble at the crests. Every step slides the whole room across its skin, and at the very rim a thin
// breath of oxide turns the reflection to oil-slick rainbows.
    const {p, facing, grazing, near, intimate} = viewerFrame()
    const t = time.mul(0.22)
    const swell = waves(p.add(vec3(t.mul(0.05), t.mul(0.04), float(0))))
    const micro = mx_noise_float(p.mul(38).add(vec3(float(0), float(0), t))).mul(0.5).add(0.5)
    const drop = beads(p.mul(8).add(41.5), 3.7)
    const beadHeight = drop.cap.mul(drop.core).mul(0.08)
    const height = swell.mul(0.032).add(beadHeight).add(micro.mul(intimate).mul(0.0015))
    this.positionNode = positionGeometry.add(normalLocal.mul(height))
    this.normalNode = proceduralNormal(height, 0.7).normalize()
    this.colorNode = color('#b8bec4')
    this.metalness = 1
    this.roughnessNode = float(0.025).add(drop.mask.mul(0.01)).add(micro.mul(near).mul(0.008))
    this.clearcoat = 0
    this.envMapIntensity = 1.05
// A whisper of tarnish only where the mirror turns edge-on to the eye.
    this.iridescenceNode = grazing.pow(4).mul(0.5)
    this.iridescenceIOR = 1.4
    this.iridescenceThicknessNode = float(320).add(micro.mul(140)).add(facing.mul(90))
    const jitter = vec3(mx_noise_float(p.mul(40)), mx_noise_float(p.mul(40).add(9)), mx_noise_float(p.mul(40).add(17))).sub(0.5)
    const shake = float(1).add(time.mul(3.1).add(drop.random.z.mul(20)).sin().mul(intimate).mul(0.5))
    const dewFlash = glints(normalViewGeometry.add(jitter.mul(0.3)), 150).mul(drop.mask).mul(near).mul(shake)
    this.emissiveNode = color('#cfe4ff').mul(grazing.pow(5).mul(0.05)).add(color('#ffffff').mul(dewFlash.mul(0.25)))
  }
}
