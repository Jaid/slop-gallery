import {MeshStandardNodeMaterial} from 'three/webgpu'
import type {Texture} from 'three/webgpu'
import type Node from 'three/src/nodes/core/Node.js'
import {float, mix, normalView, output, positionViewDirection, reflector, vec4} from 'three/tsl'

/** Shared planar reflection lifecycle and view-dependent surface polish. */
export class ReflectiveFloorMaterial extends MeshStandardNodeMaterial {
  readonly reflection = reflector({resolutionScale: 0.75, generateMipmaps: true, bounces: false})

  constructor(map: Texture, {color, roughness, strength, grazingStrength, blur, mask = float(1)}: {
    color: string
    roughness: number
    strength: number
    grazingStrength: number
    blur: number
    mask?: Node<'float'>
  }) {
    super({map, color, roughness})
    const grazing = normalView.dot(positionViewDirection).abs().oneMinus().pow(5)
    const reflectance = grazing.mul(grazingStrength).add(strength).mul(mask)
    this.outputNode = vec4(mix(output.rgb, this.reflection.level(float(blur)).rgb, reflectance), output.a)
  }

  override dispose() {
    this.reflection.dispose()
    super.dispose()
  }
}
