import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal, normalViewGeometry, positionGeometry, time, uv, vec2, vec3} from 'three/tsl'

import {beads} from '../../lib/beads.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {silk} from './lib/silk.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.5)
    this.name = knotData.id
// A knot of spider silk strung out at dawn and jeweled with dew. The strands are almost nothing — they show
// as a pale ghost against the dark — but every droplet is a lens, and as you circle the knot each one takes
// its turn flashing an inverted morning back at you. Come closer and the plied twist of the silk resolves.
    const {p, facing, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const thread = silk(tube.mul(vec2(3, 1)))
    const mist = beads(p.mul(24).add(17.25), 8.4)
    const heavy = beads(p.mul(9).add(3.5), 21.7)
    const dropMask = mist.mask.mul(0.45).add(heavy.mask)
    const dropCap = mist.cap.mul(mist.core).mul(0.3).add(heavy.cap.mul(heavy.core))
    const wobble = time.mul(1.7).add(heavy.random.z.mul(20)).sin().mul(intimate).mul(0.35)
    const height = thread.cord.mul(0.12).add(dropCap.mul(3)).add(thread.sheen.mul(thread.cord).mul(intimate).mul(0.2))
    this.positionNode = positionGeometry.add(normalLocal.mul(height.mul(0.004).add(wobble.mul(0.0002))))
    this.normalNode = proceduralNormal(height, 0.45).add(dropCap.sub(0.5).mul(dropMask).mul(0.6)).add(normalLocal.mul(wobble.mul(0.02))).normalize()
    const silkColor = mix(color('#8a857c'), color('#d8d2c4'), thread.sheen).mul(thread.cord.mul(0.5).add(0.08))
    const film = spectralColor(facing.mul(6).add(p.x.mul(3)).add(p.y.mul(2)).add(heavy.random.x.mul(2)))
    const dropColor = mix(color('#f2f6ff'), film, 0.65)
    this.colorNode = mix(silkColor, dropColor, dropMask.clamp(0, 1))
    this.metalness = 0
    this.roughnessNode = float(0.3).add(thread.cord.mul(0.2)).sub(dropMask.mul(0.24)).clamp(0.03, 1)
    this.iridescenceNode = dropMask.clamp(0, 1).mul(0.85)
    this.iridescenceIOR = 1.33
    this.iridescenceThicknessNode = float(220).add(heavy.random.y.mul(240)).add(facing.mul(140))
    this.clearcoatNode = dropMask.clamp(0, 1)
    this.clearcoatRoughness = 0.02
    this.aoNode = thread.cord.mul(0.15).oneMinus()
    this.envMapIntensity = 0.5
    const jitter = vec3(mx_noise_float(p.mul(120)), mx_noise_float(p.mul(120).add(9)), mx_noise_float(p.mul(120).add(17))).sub(0.5)
    const dropGlint = glints(normalViewGeometry.add(jitter.mul(0.3)), 140).mul(dropMask).mul(near.mul(0.5).add(0.5))
    const threadGlint = glints(normalLocal, 60).mul(thread.cord).mul(intimate).mul(0.25)
    this.emissiveNode = film.mul(dropGlint.mul(1.2)).add(color('#fff6e8').mul(grazing.pow(3).mul(thread.cord).mul(0.15))).add(color('#ffffff').mul(threadGlint))
  }
}
