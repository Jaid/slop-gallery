import type {ColorRepresentation, Texture} from 'three/webgpu'

import {materialColor, positionWorld, texture, vec2} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/**
 * Wood mapped by world position on the horizontal plane, so separate floor slabs continue each other’s grain.
 *
 * `origin` and `tilesPerMeter` reproduce the UVs of an existing floor box: its top face maps `[minX, maxZ]` to the
 * texture origin, with u growing along +x and v along −z.
 */
export default class WorldMappedWoodMaterial extends MeshStandardNodeMaterial {
  constructor({map, origin, tilesPerMeter, color, roughness, envMapIntensity}: {
    color: ColorRepresentation
    envMapIntensity: number
    map: Texture
    origin: readonly [number, number]
    roughness: number
    tilesPerMeter: number
  }) {
    super({
      color,
      roughness,
      envMapIntensity,
    })
    const uv = vec2(positionWorld.x.sub(origin[0]), positionWorld.z.negate().add(origin[1])).mul(tilesPerMeter)
    this.colorNode = texture(map, uv).mul(materialColor)
  }
}
