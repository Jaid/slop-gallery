import type {VelvetStyle} from './VelvetWallMaterial.ts'

import {color, float, max, mix, mx_noise_float, normalViewGeometry, positionLocal, positionViewDirection} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from './filters.ts'
import {oxbloodVelvet} from './VelvetWallMaterial.ts'

/**
 * Velvet stretched over padded seats and backs, without any texture or UVs.
 *
 * Sitting has crushed the pile in soft patches, which read lighter and silkier than the upright pile around them; a fine, short nap ripples the rest. The fibers scatter a soft sheen at grazing angles instead of a mirror highlight, so the rounded edges of a cushion glow while its faces stay deep. The pattern follows the mesh’s own frame, and its grain fades to its average before it could shimmer.
 */
export default class UpholsteryVelvetMaterial extends MeshPhysicalNodeMaterial {
  constructor({style = oxbloodVelvet}: {style?: VelvetStyle} = {}) {
    super({
      envMapIntensity: 0.12,
      metalness: 0,
      roughness: 0.9,
      specularIntensity: 0.5,
    })
    this.name = 'Upholstery velvet'
    const p = positionLocal
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth()).toVar('upholsteryFootprint')
    const unit = (value: ReturnType<typeof mx_noise_float>) => value.mul(0.5).add(0.5)
    const crush = unit(mx_noise_float(p.mul(5.5))).mul(0.65).add(unit(mx_noise_float(p.mul(13).add(4.2))).mul(0.35)).smoothstep(0.38, 0.8).toVar('upholsteryCrush')
    const nap = mix(float(0.5), unit(mx_noise_float(p.mul(140))), visibleDetail(footprint, 1 / 140 / 1.5)).toVar('upholsteryNap')
    const light = float(0.32).add(crush.mul(0.2)).add(nap.sub(0.5).mul(0.25)).clamp(0, 1)
    const body = mix(color(style.deep), color(style.pile), light.smoothstep(0, 0.45))
    const slant = normalViewGeometry.dot(positionViewDirection).abs().oneMinus().pow(2)
    this.colorNode = mix(body, color(style.crushed), light.smoothstep(0.45, 1)).mul(slant.mul(1.3).add(1))
    this.roughnessNode = float(0.9).sub(crush.mul(0.25))
    this.sheenNode = color(style.sheen).mul(crush.mul(0.4).add(0.35).mul(nap.mul(0.3).add(0.85)))
    this.sheenRoughnessNode = float(0.5).sub(crush.mul(0.1))
    this.normalNode = heightNormal(crush.mul(0.0012).add(nap.mul(0.00012).mul(visibleDetail(footprint, 1 / 140 / 3.6))))
  }
}
