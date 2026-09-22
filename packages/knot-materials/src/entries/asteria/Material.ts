import type {Texture} from 'three/webgpu'

import {cameraPosition, color, float, mix, mx_noise_float, normalLocal, normalWorld, positionGeometry, positionWorld, vec3} from 'three/tsl'

import {beads} from '../../lib/beads.ts'
import {glints} from '../../lib/glints.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {asterism} from './lib/asterism.ts'
import {needles} from './lib/needles.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
// A star sapphire cut en cabochon: a deep blue stone shot through with rutile needles. Their three lattices
// braid into a six-rayed star that sits exactly where the light returns to your eye — so the star walks the
// stone as you walk the gallery, never quite still. Up close, the silk of the needles stands ready to flash.
    const {p, grazing, near, intimate} = viewerFrame()
    const view = cameraPosition.sub(positionWorld).normalize()
    const star = asterism(normalWorld, view)
    const zoning = mx_noise_float(p.mul(1.8).add(4)).mul(0.5).add(0.5)
    const silk = needles(p)
    const grit = beads(p.mul(90).add(12), 33)
    const height = silk.raw.mul(intimate).mul(0.22).add(grit.core.mul(intimate).mul(0.3))
    this.positionNode = positionGeometry.add(normalLocal.mul(height.mul(0.0015)))
    this.normalNode = proceduralNormal(height, 0.25).add(normalLocal.mul(silk.band.sub(0.5).mul(intimate.mul(0.08)))).normalize()
    const deep = color('#0a1f6e')
    const violet = color('#2a1560')
    const body = mix(deep, violet, zoning).mul(float(0.75).add(silk.band.mul(0.2)))
    this.colorNode = body
    this.metalness = 0
    this.roughnessNode = float(0.06).add(silk.band.mul(0.05)).add(grit.mask.mul(0.08))
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.ior = 1.765
    this.envMapIntensity = 1
    this.aoNode = grit.mask.mul(0.12).oneMinus()
    const jitter = vec3(mx_noise_float(p.mul(95)), mx_noise_float(p.mul(95).add(9)), mx_noise_float(p.mul(95).add(17))).sub(0.5)
    const needleFlash = glints(normalLocal, 70).mul(silk.band).mul(near).mul(0.6).add(star.spot.mul(silk.band).mul(0.8))
    const gritFlash = glints(normalLocal.add(jitter.mul(0.25)), 130).mul(grit.mask).mul(intimate)
    const fire = color('#eaf2ff').mul(star.rays.mul(3)).add(color('#ffffff').mul(star.core.mul(4)))
    this.emissiveNode = fire.add(body.mul(grazing.pow(3).mul(0.2))).add(color('#9fc4ff').mul(needleFlash)).add(color('#ffffff').mul(gritFlash.mul(0.6)))
  }
}
