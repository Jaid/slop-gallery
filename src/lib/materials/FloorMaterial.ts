import type Node from 'three/src/nodes/core/Node.js'
import type NodeFrame from 'three/src/nodes/core/NodeFrame.js'
import type {Camera, MRTNode, Renderer, Scene, Texture} from 'three/webgpu'

import {float, mix, normalView, output, positionViewDirection, reflector, vec4} from 'three/tsl'
import {Box3, DepthTexture, Frustum, HalfFloatType, LinearMipMapLinearFilter, Matrix4, MeshStandardNodeMaterial, NodeUpdateType, Object3D, RenderTarget, VelocityNode} from 'three/webgpu'

/** what the reflection needs from the pass it is reflected into */
export type ReflectionPass = {
  camera: Camera
  mrt: MRTNode | null
  renderer: Renderer
  /** reflection pixels per pixel of the pass along each axis */
  resolutionScale?: number
  scene: Scene
  target: RenderTarget
}

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
  render: (pass: ReflectionPass) => void
} | null = null
let reflecting = false
// The reflection renders the scene with the main pass’s outputs, motion included. Velocity remembers each object’s matrix after drawing it for the next frame, which the main pass still has to see.
const {updateAfter} = VelocityNode.prototype as {updateAfter: (this: VelocityNode, frame: NodeFrame) => void}
VelocityNode.prototype.updateAfter = function (this: VelocityNode, frame) {
  if (!reflecting) {
    updateAfter.call(this, frame)
  }
}
const bounds = new Box3
const frustum = new Frustum
const projection = new Matrix4
/** Renders the shared floor reflection for the main pass about to render, if a floor will be in view. */
export function renderFloorReflection(pass: ReflectionPass) {
  shared?.render(pass)
}
/** Bounds the floor a reflection target lies in: its nearest ancestor with geometry, since some floors keep the target in a group of its own. */
function floorBounds(target: Object3D) {
  for (let node = target.parent; node; node = node.parent) {
    if (!bounds.setFromObject(node).isEmpty()) {
      break
    }
  }
  return bounds
}
/**
 * All reflective floors of a level lie in one plane, so they share one reflection and the scene is mirrored once per frame instead of once per floor.
 * Every floor sampling the reflection hides while it renders, since a pass can’t sample the texture it draws into.
 *
 * The reflection renders right before the main pass, with the same outputs into a target of the same layout, so every material shares its shaders between both instead of building them twice. Rendered from within the main pass, it would be one call deeper and get shaders of its own.
 */
function acquireReflection(floor: FloorMaterial) {
  if (!shared) {
    const reflection = reflector({
      // Native-resolution reflections retain mipmap LOD filtering for rough surfaces. Each pass may render it at a scale of its own.
      resolutionScale: 1,
      generateMipmaps: true,
      bounces: false,
    })
    const floors = new Set<FloorMaterial>
    const base = reflection.reflector as typeof reflection.reflector & {
      getRenderTarget: (camera: Camera) => RenderTarget
      renderTargets: Map<Camera, RenderTarget>
    }
    const update = base.updateBefore.bind(base)
    base.updateBeforeType = NodeUpdateType.NONE
    // The target takes the layout of the pass the reflection renders for, and holds color alone until there is one.
    let layout: RenderTarget | null = null
    base.getRenderTarget = camera => {
      const count = layout?.textures.length ?? 1
      let renderTarget = base.renderTargets.get(camera)
      if (renderTarget?.textures.length !== count) {
        renderTarget?.dispose()
        renderTarget = new RenderTarget(1, 1, {
          type: HalfFloatType,
          samples: layout?.samples ?? 0,
          count,
        })
        // Only the color is sampled, with mipmaps for rough floors.
        renderTarget.texture.minFilter = LinearMipMapLinearFilter
        renderTarget.texture.generateMipmaps = true
        if (layout) {
          for (const [i, texture] of renderTarget.textures.entries()) {
            texture.name = layout.textures[i].name
          }
          if (layout.depthTexture) {
            renderTarget.depthTexture = new DepthTexture
            renderTarget.depthTexture.type = layout.depthTexture.type
          }
        }
        base.renderTargets.set(camera, renderTarget)
      }
      return renderTarget
    }
    const render = ({camera, mrt, renderer, resolutionScale = 1, scene, target}: ReflectionPass) => {
      // Any mounted floor spans the plane. One that isn’t mounted yet has no world matrix.
      const mounted = [...floors].filter(candidate => candidate.reflectionTarget!.parent)
      // Only a floor the main pass draws needs the reflection, and the main pass leaves out floors outside the camera frustum. The frame’s matrices aren’t updated yet.
      camera.updateWorldMatrix(true, false)
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem, camera.reversedDepth)
      if (!mounted.some(candidate => frustum.intersectsBox(floorBounds(candidate.reflectionTarget!)))) {
        return
      }
      base.target = mounted[0].reflectionTarget!
      base.resolutionScale = resolutionScale
      layout = target
      const visible = [...floors].map(candidate => candidate.visible)
      for (const candidate of floors) {
        candidate.visible = false
      }
      // The reflector clears the outputs to render color alone; it gets the main pass’s outputs instead.
      const {setMRT} = renderer as {setMRT: (this: Renderer, next: MRTNode | null) => Renderer}
      let cleared = false
      renderer.setMRT = function (this: Renderer, next) {
        if (!cleared && next === null) {
          cleared = true
          return setMRT.call(this, mrt)
        }
        return setMRT.call(this, next)
      }
      reflecting = true
      try {
        update({
          camera,
          material: mounted[0],
          renderer,
          scene,
        } as unknown as NodeFrame)
      } finally {
        reflecting = false
        delete (renderer as Partial<Renderer>).setMRT
        let i = 0
        for (const candidate of floors) {
          candidate.visible = visible[i++]!
        }
      }
    }
    shared = {
      floors,
      reflection,
      render,
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
