import {bumpMap, float, mx_noise_float, positionWorld} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

/** Fine regolith above actual displaced rock, rather than a smooth shaded bowl. */
export class CraterMaterial extends MeshStandardNodeMaterial {
  constructor(vertexColors = true) {
    super({
      vertexColors,
      color: vertexColors ? '#ffffff' : '#787165',
      roughness: 0.98,
      envMapIntensity: 0.08,
    })
    const grit = mx_noise_float(positionWorld.mul(36)).mul(0.35).add(mx_noise_float(positionWorld.mul(11)).mul(0.65))
    this.normalNode = bumpMap(grit, float(0.045))
  }
}
