import {bumpMap, color, float, mix, mx_noise_float, normalWorld, positionWorld} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Meter-scaled, staggered ashlar with recessed joints and chipped mineral grain. */
export class CastleStoneMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      roughness: 0.96,
      envMapIntensity: 0.15,
    })
    const horizontal = normalWorld.y.abs().greaterThan(0.99)
    const along = horizontal.select(positionWorld.x, positionWorld.x.add(positionWorld.z))
    const across = horizontal.select(positionWorld.z, positionWorld.y)
    const chips = mx_noise_float(positionWorld.mul(17)).mul(0.025)
    const row = across.div(0.38).add(chips)
    const column = along.div(0.76).add(row.floor().mod(2).mul(0.5)).add(chips)
    const edges = row.fract().min(row.fract().oneMinus()).min(column.fract().min(column.fract().oneMinus()))
    const joint = edges.smoothstep(0.012, 0.043)
    const grain = mx_noise_float(positionWorld.mul(24))
    const mineral = mx_noise_float(positionWorld.mul(3.7))
    const block = mx_noise_float(column.floor().add(row.floor().mul(31)).mul(0.73).add(3.27))
    this.colorNode = mix(color('#373b35'), color('#6b706b').mul(mineral.mul(0.23).add(block.mul(0.28)).add(grain.mul(0.085)).add(1)), joint)
    this.normalNode = bumpMap(joint.mul(0.4).add(mineral.mul(0.5)).add(grain.mul(0.2)), float(0.1))
    this.roughnessNode = grain.mul(0.04).add(0.94)
  }
}
