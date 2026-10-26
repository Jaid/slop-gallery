import type Node from 'three/src/nodes/core/Node.js'
import type NodeBuilder from 'three/src/nodes/core/NodeBuilder.js'
import type NodeFrame from 'three/src/nodes/core/NodeFrame.js'
import type {Camera, MRTNode, Renderer, Scene, Texture} from 'three/webgpu'

import {float, Fn, If, int, materialRoughness, mix, normalView, output, positionViewDirection, reflector, textureBicubicLevel, uniform, vec2, vec4} from 'three/tsl'
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
  /** radius of the Gaussian blur over the mirror, in pixels of a 1080-row image; 0 leaves it unblurred */
  gaussianBlur?: number
  grazingStrength: number
  /** mip level the mirror is read at, 0 being its full resolution and every step halving it */
  loss: Node<'float'> | number
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
/** factor on every floor’s reflectance, which the render pipeline sets to 0 when it renders no reflection */
export const floorReflectionStrength = uniform(1)
/** factor on every floor’s extra reflectance at grazing angles */
export const floorReflectionGrazing = uniform(1)
/** factor on every floor’s loss, the mip level of the mirror it reads */
export const floorReflectionLevel = uniform(1)
/** factor on every floor’s Gaussian blur radius */
export const floorReflectionBlur = uniform(1)
/** taps of the mirror blur, spread evenly over a disk */
const blurTaps = 16
/** the golden angle, which spreads consecutive taps around the disk without lining up */
const goldenAngle = Math.PI * (3 - Math.sqrt(5))
/** factor on every reflective floor’s roughness, which shapes its highlights and environment lighting but not its mirror */
export const floorReflectionRoughness = uniform(1)
/** mip levels the reflection lacks when rendered below native resolution, which every floor’s loss already covers */
const reflectionLevelBias = uniform(0)
/** Renders the shared floor reflection for the main pass about to render, if a floor will be in view. */
export function renderFloorReflection(pass: ReflectionPass) {
  shared?.render(pass)
}
/**
 * Reads the mirror at a mip level through a B-spline filter: a plain lookup of a coarse mip magnifies its texels bilinearly, which shows as blocky stair-steps around bright shapes.
 *
 * With a blur radius, it averages Gaussian-weighted taps over a disk around the point instead, each read from the mip whose texels lie about as far apart as the taps, so no detail between them flickers.
 */
function sampleMirror(reflection: Reflection, level: Node<'float'>, gaussianBlur: number) {
  const smooth = textureBicubicLevel(reflection, level)
  if (!(gaussianBlur > 0)) {
    return smooth
  }
  return Fn(() => {
    const result = smooth.toVar('floorMirror')
    const radius = floorReflectionBlur.mul(gaussianBlur / 1080).toVar('floorMirrorBlur')
    If(radius.greaterThan(0), () => {
      const size = vec2(reflection.size(int(0)) as Node<'ivec2'>)
      const tapLevel = radius.mul(size.y).mul(2 / Math.sqrt(blurTaps)).max(1).log2().max(level)
      // Offsets are in fractions of the image height; x shrinks by the aspect ratio so the disk stays round.
      const scale = vec2(size.y.div(size.x), 1).mul(radius)
      const uv = reflection.uvNode as Node<'vec2'>
      let sum: Node<'vec4'> = vec4(0)
      let total = 0
      for (let i = 0; i < blurTaps; i++) {
        const distance = Math.sqrt((i + 0.5) / blurTaps)
        const angle = i * goldenAngle
        const weight = Math.exp(-2 * distance ** 2)
        sum = sum.add(reflection.sample(uv.add(vec2(Math.cos(angle) * distance, Math.sin(angle) * distance).mul(scale))).level(tapLevel).mul(weight))
        total += weight
      }
      result.assign(sum.div(total))
    })
    return result
  })()
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
      // A floor sampling mip level n of a native-resolution target only sees a 2ⁿ-fold coarser image, so a smaller target loses nothing as long as the level shrinks along with it.
      reflectionLevelBias.value = Math.min(Math.log2(resolutionScale), 0)
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
      const reflectance = grazing.mul(reflection.grazingStrength).mul(floorReflectionGrazing).add(reflection.strength).mul(reflection.mask ?? float(1)).mul(floorReflectionStrength)
      const loss = typeof reflection.loss === 'number' ? float(reflection.loss) : reflection.loss
      const mirror = sampleMirror(this.reflection, loss.mul(floorReflectionLevel).add(reflectionLevelBias).max(0), reflection.gaussianBlur ?? 0)
      this.outputNode = vec4(mix(output.rgb, mirror.rgb, reflectance), output.a)
    }
  }

  override dispose() {
    if (this.reflectionTarget) {
      releaseReflection(this)
    }
    super.dispose()
  }

  override setupVariants(builder: NodeBuilder) {
    if (!this.reflection) {
      super.setupVariants(builder)
      return
    }
    // Scales the roughness for this build only, so rebuilding never stacks the factor.
    const {roughnessNode} = this
    this.roughnessNode = ((roughnessNode ?? materialRoughness) as Node<'float'>).mul(floorReflectionRoughness).min(1)
    super.setupVariants(builder)
    this.roughnessNode = roughnessNode
  }
}
