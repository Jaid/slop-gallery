import type {Texture} from 'three/webgpu'

import {cameraPosition, color, float, mix, modelWorldMatrixInverse, mx_fractal_noise_float, mx_noise_float, normalLocal, positionGeometry, time, uv, vec3, vec4} from 'three/tsl'

import {filament} from '../../candidates/gpt_sol/lib/filament.ts'
import {multiGlint} from '../../candidates/gpt_sol/lib/multiGlint.ts'
import {viewerFrame} from '../../candidates/gpt_sol/lib/viewerFrame.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import knotData from './data.ts'

export default class extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    this.envMapIntensity = 1.35
    const p = positionGeometry
    const tube = uv()
    const cameraLocal = modelWorldMatrixInverse
      .mul(vec4(cameraPosition, 1))
      .xyz
    const observerDirection = cameraLocal
      .sub(p)
      .normalize()
    const proximity = cameraLocal
      .sub(p)
      .length()
      .smoothstep(1.1, 5)
      .oneMinus()
    const observer = observerDirection.dot(vec3(0.58, 0.39, -0.71).normalize())
    const phaseA = tube.x
      .mul(TAU * 36)
      .add(tube.y
        .mul(TAU * 7)
        .sin()
        .mul(1.25))
      .add(observer
        .mul(proximity)
        .mul(0.65))
      .add(time.mul(0.09))
    const phaseB = tube.y
      .mul(TAU * 12)
      .sub(tube.x
        .mul(TAU * 5)
        .sin()
        .mul(0.8))
      .sub(time.mul(0.065))
    const phaseC = tube.x
      .mul(TAU * 23)
      .sub(tube.y.mul(TAU * 19))
      .add(observer.mul(0.4))
      .add(time.mul(0.045))
    const combA = phaseA
      .sin()
      .abs()
      .pow(12)
      .mul(phaseB
        .cos()
        .abs()
        .pow(8))
    const combB = phaseC
      .sin()
      .abs()
      .pow(10)
      .mul(phaseA
        // Preserve an integer 23-cycle winding at the UV wrap; arbitrary scaling opens a visible seam.
        .mul(23 / 36)
        .cos()
        .abs()
        .pow(7))
    const domain = mx_noise_float(p.mul(7).add(vec3(time.mul(0.018), time.mul(-0.011), time.mul(0.009))))
    const needles = combA
      .mul(domain.mul(0.35).add(0.82))
      .add(combB.mul(0.58))
      .clamp()
    const height = needles
      .pow(0.72)
      .mul(proximity.mul(0.5).add(0.55))
      .mul(0.041)
      .add(domain.mul(0.0025))
    this.positionNode = p.add(normalLocal.mul(height))
    const {facing, grazing, near, intimate} = viewerFrame()
    const domainWall = filament(domain, 0.032)
    const oxideRaw = mx_fractal_noise_float(p.mul(9), 3, 2, 0.5)
      .mul(0.5)
      .add(0.5)
    const oxide = oxideRaw
      .smoothstep(0.7, 0.9)
      .mul(domainWall.oneMinus())
    const needleLight = facing
      .mul(0.16)
      .add(needles.mul(0.58))
      .clamp()
    const iron = mix(color('#020405'), color('#718087'), needleLight)
    const temper = mix(color('#352219'), color('#17383e'), observer.mul(0.5).add(0.5))
    this.colorNode = mix(iron, temper, domainWall
      .mul(0.17)
      .add(oxide.mul(0.28))
      .clamp())
    this.metalness = 0.98
    this.roughnessNode = float(0.23)
      .sub(needles.mul(0.13))
      .add(oxide.mul(0.16))
      .add(grazing.mul(0.025))
      .clamp(0.055, 0.42)
    this.clearcoat = 0.22
    this.clearcoatRoughness = 0.16
    this.anisotropy = 0.88
    this.anisotropyRotation = Math.PI * 0.5
    const magneticNormal = proceduralNormal(height, 0.9)
    this.normalNode = magneticNormal
    const glint = multiGlint(magneticNormal, 120)
    const barkhausen = time
      .mul(3.4)
      .add(domain.mul(19))
      .add(tube.x.mul(TAU * 11))
      .sin()
      .mul(0.5)
      .add(0.5)
      .pow(24)
    this.emissiveNode = color('#8ee7ff')
      .mul(domainWall)
      .mul(barkhausen)
      .mul(intimate)
      .mul(0.75)
      .add(color('#e9ffff')
        .mul(glint)
        .mul(needles)
        .mul(near.mul(0.16).add(0.035)))
  }
}
