import type Node from 'three/src/nodes/core/Node.js'
import type NodeFrame from 'three/src/nodes/core/NodeFrame.js'
import type {Texture} from 'three/webgpu'

import {float, mix, normalView, output, positionViewDirection, reflector, vec4} from 'three/tsl'
import {MeshStandardNodeMaterial, Object3D} from 'three/webgpu'

type FloorReflection = {
  blur: Node<'float'> | number
  grazingStrength: number
  mask?: Node<'float'>
  strength: number
}

type Reflection = ReturnType<typeof reflector>

let shared: {
  floors: Set<FloorMaterial>
  reflection: Reflection
} | null = null
/**
 * All reflective floors of a level lie in one plane, so they share one reflection and the scene is mirrored once per frame instead of once per floor.
 * Every floor sampling the reflection hides while it renders, since a pass can’t sample the texture it draws into.
 */
function acquireReflection(floor: FloorMaterial) {
  if (!shared) {
    const reflection = reflector({
      // Native-resolution reflections retain mipmap LOD filtering for rough surfaces.
      resolutionScale: 1,
      generateMipmaps: true,
      bounces: false,
    })
    const floors = new Set<FloorMaterial>
    const base = reflection.reflector
    const update = base.updateBefore.bind(base)
    base.updateBefore = (frame: NodeFrame) => {
      // Any mounted floor spans the plane. One that isn’t mounted yet has no world matrix.
      const target = [...floors].find(candidate => candidate.reflectionTarget!.parent)?.reflectionTarget
      if (!target) {
        return
      }
      base.target = target
      const visible = [...floors].map(candidate => candidate.visible)
      for (const candidate of floors) {
        candidate.visible = false
      }
      try {
        return update(frame)
      } finally {
        let i = 0
        for (const candidate of floors) {
          candidate.visible = visible[i++]!
        }
      }
    }
    shared = {
      floors,
      reflection,
    }
  }
  shared.floors.add(floor)
  return shared.reflection
}
function releaseReflection(floor: FloorMaterial) {
  if (shared?.floors.delete(floor) && shared.floors.size === 0) {
    shared.reflection.dispose()
    shared = null
  }
}

/**
 * Optional planar reflection ownership; fast-mode materials allocate no reflection targets.
 *
 * Procedural floors pass no `map` and set their own `colorNode`; the reflection mixes over whatever the surface shades to.
 */
export default class FloorMaterial extends MeshStandardNodeMaterial {
  readonly reflection: Reflection | null
  /** the plane of the shared reflection, to be laid at the floor’s surface facing up the local z axis */
  readonly reflectionTarget: Object3D | null

  constructor(map: Texture | null, {color, roughness, reflection}: {
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
    this.reflectionTarget = reflection ? new Object3D : null
    this.reflection = this.reflectionTarget ? acquireReflection(this) : null
    if (this.reflection && reflection) {
      const grazing = normalView.dot(positionViewDirection).abs().oneMinus().pow(5)
      const reflectance = grazing.mul(reflection.grazingStrength).add(reflection.strength).mul(reflection.mask ?? float(1))
      const blur = typeof reflection.blur === 'number' ? float(reflection.blur) : reflection.blur
      this.outputNode = vec4(mix(output.rgb, this.reflection.level(blur).rgb, reflectance), output.a)
    }
  }

  override dispose() {
    if (this.reflectionTarget) {
      releaseReflection(this)
    }
    super.dispose()
  }
}
