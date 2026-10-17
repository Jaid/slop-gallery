import {color, mix, mx_noise_float, positionWorld} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/**
 * Polished brass for thin floor inlays: warm yellow metal with faint dulled patches.
 *
 * Not fully metallic: seen edge-on across a room, a 3 cm strip mostly mirrors the dim horizon of the gallery’s environment and would read as a black joint. A little diffuse brass keeps it golden under the room’s own lamps, while the polish still catches their highlights.
 */
export default class PolishedBrassMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      metalness: 0.75,
      roughness: 0.26,
      envMapIntensity: 1,
    })
    const dull = mx_noise_float(positionWorld.mul(1.7)).mul(0.5).add(0.5).smoothstep(0.4, 0.85)
    this.colorNode = mix(color('#dcb565'), color('#b08d4e'), dull.mul(0.6))
    this.roughnessNode = dull.mul(0.12).add(0.22)
  }
}
