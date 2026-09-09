import type Node from 'three/src/nodes/core/Node.js'
import type {Texture} from 'three/webgpu'

import {float, mix, normalView, output, positionViewDirection, reflector, vec4} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

type FloorReflection = {
  blur: number
  grazingStrength: number
  mask?: Node<'float'>
  strength: number
}

/** Optional planar reflection ownership; performance materials allocate no reflection targets. */
export class FloorMaterial extends MeshStandardNodeMaterial {
  readonly reflection: ReturnType<typeof reflector> | null

  constructor(map: Texture, {color, roughness, reflection}: {
    color: string
    reflection?: FloorReflection
    roughness: number
  }) {
    super({
      map,
      color,
      roughness,
      metalness: 0,
      envMapIntensity: reflection ? 1 : 0,
    })
    this.reflection = reflection ? reflector({
      resolutionScale: 0.75,
      generateMipmaps: true,
      bounces: false,
    }) : null
    if (this.reflection && reflection) {
      const grazing = normalView.dot(positionViewDirection).abs().oneMinus().pow(5)
      const reflectance = grazing.mul(reflection.grazingStrength).add(reflection.strength).mul(reflection.mask ?? float(1))
      this.outputNode = vec4(mix(output.rgb, this.reflection.level(float(reflection.blur)).rgb, reflectance), output.a)
    }
  }

  override dispose() {
    this.reflection?.dispose()
    super.dispose()
  }
}
