import type {AntiAliasing} from './antiAliasing.ts'
import type {CustomGraphicsStructure, CustomGraphicsUniform} from './customGraphics.ts'
import type {Camera, NodeBuilder, NodeMaterial, Object3D, Renderer, RenderTarget, Scene, TextureNode} from 'three/webgpu'

import {WireframeFloodPass} from 'capture-session'
import {vxgi} from 'three/addons/lighting/vxgi/VXGINode.js'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {denoise} from 'three/addons/tsl/display/DenoiseNode.js'
import {depthAwareBlend} from 'three/addons/tsl/display/depthAwareBlend.js'
import {gaussianBlur} from 'three/addons/tsl/display/GaussianBlurNode.js'
import {godrays} from 'three/addons/tsl/display/GodraysNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {smaa} from 'three/addons/tsl/display/SMAANode.js'
import {ssgi} from 'three/addons/tsl/display/SSGINode.js'
import {sss} from 'three/addons/tsl/display/SSSNode.js'
import {traa} from 'three/addons/tsl/display/TRAANode.js'
import {convertToTexture, diffuseColor, float, int, interleavedGradientNoise, length, luminance, max, min, mrt, normalView, output, pass, renderOutput, rtt, screenCoordinate, screenUV, smoothstep, uniform, uv, vec2, vec3, vec4, velocity} from 'three/tsl'
import {BlendMode, DirectionalLight, HalfFloatType, MRTNode, NoBlending, Node, NormalBlending, PerspectiveCamera, RenderPipeline} from 'three/webgpu'

import {renderFloorReflection} from '../materials/FloorMaterial.ts'
import ConditionalTexture from './ConditionalTexture.ts'
import {getTunedGraphics, subscribeTunedGraphics} from './customGraphics.ts'
import {GalleryRenderer} from './GalleryRenderer.ts'
import KnotBokeh from './KnotBokeh.ts'
import tiltShift from './tiltShift.ts'
import ZoomBlur from './ZoomBlur.ts'

/** Brightest luminance one pixel may feed into bloom. Intended glow sources (chandelier flames, emissive veins) peak around 4; sharp specular fireflies reach hundreds. */
const bloomLuminanceCap = 8

export type GalleryRenderPipelineOptions = {
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionResolutionScale?: number
  /** ambient occlusion samples per pixel */
  ambientOcclusionSamples?: number
  antiAliasing?: AntiAliasing
  contactDarkening?: boolean
  /** the tuned passes, which override the options they cover; the pipeline’s uniforms then follow the tuning panel live, or the graphics mode’s own values while it is hidden */
  custom?: CustomGraphicsStructure
  focus?: {
    amount: () => number
    /** scales the lens blur’s radius; 0 keeps the background sharp */
    blur?: () => number
    distance: () => number
    proximity: () => number
  }
  heavy?: boolean
  /** whether screen-space and voxel indirect light bounce the lit scene off the surfaces’ diffuse color, needs heavy */
  indirectLight?: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale?: number
  /** whether the shadow-casting sun scatters through the air as shafts of light, needs heavy */
  volumetricLight?: boolean
  zoom?: () => number
}

/**
 * MRT outputs for a soft, depth-less transparent sprite, like a water droplet or a puff of mist: its color blends as usual, but its geometry buffers carry alpha 0, so the normal and motion of the surface behind it stay in place.
 *
 * Without this, the sprite’s whole quad – including the fully transparent part around the soft disc – writes its camera-facing normal over the background’s, and the ambient occlusion, reading that normal against the background’s depth, darkens the quad to a black rectangle.
 *
 * Rendered into a target without these buffers, like a capture target or the canvas, the material writes its color alone.
 */
export class TransparentSpriteOutputsNode extends MRTNode {
  constructor() {
    super({
      output,
      normal: vec4(normalView, 0),
      // The velocity node’s declaration lacks the node extensions every other node has.
      velocity: vec4(velocity as unknown as Node<'vec2'>, 0, 0),
      diffuseColor: vec4(0),
    })
  }

  override setup(builder: NodeBuilder) {
    const target = builder.renderer.getRenderTarget()
    if (target?.textures.some(texture => texture.name in this.outputNodes)) {
      return super.setup(builder)
    }
    // The builder keeps the struct output for every MRT node; a target without named outputs gets the color at its first attachment.
    this.members = [output.convert((builder as NodeBuilder & {getOutputType: (index: number) => string}).getOutputType(0))]
    const plain = Node.prototype as Node
    return plain.setup.call(this, builder)
  }
}

/** All depth-dependent work stays in the current frame; one antialiasing resolve (TRAA by default) antialiases the finished composite. */
export default class GalleryRenderPipeline extends RenderPipeline {
  readonly scenePass: ReturnType<typeof pass>
  private readonly effects: Array<{dispose: () => void}> = []
  private readonly unsubscribe?: () => void

  constructor(renderer: Renderer, scene: Object3D, camera: Camera, options: GalleryRenderPipelineOptions = {}) {
    super(renderer)
    const {custom} = options
    const {antiAliasing = 'traa', ambientOcclusionResolutionScale = 0.75, ambientOcclusionSamples = 16, contactDarkening = false, focus, heavy = true, indirectLight = false, reflectionResolutionScale = 1, volumetricLight = false, zoom = () => 0} = custom ? {
      ...options,
      ambientOcclusionResolutionScale: custom.ambientOcclusionResolutionScale,
      antiAliasing: custom.antiAliasing,
      indirectLight: custom.screenSpaceIndirectLight || custom.voxelIndirectLight,
      reflectionResolutionScale: custom.reflectionResolutionScale,
      volumetricLight: custom.volumetricLight,
    } : options
    const own = <T extends {dispose: () => void}>(effect: T) => {
      this.effects.push(effect)
      return effect
    }
    const tuned = custom ? getTunedGraphics() : undefined
    const bindings: Array<[{value: number}, CustomGraphicsUniform]> = []
    // Built with `custom`, a uniform starts out at its tuned value and follows it; otherwise it takes the pipeline’s own.
    const tune = (node: {value: number}, key: CustomGraphicsUniform, fallback: number) => {
      node.value = tuned ? tuned[key] : fallback
      if (tuned) {
        bindings.push([node, key])
      }
    }
    // GTAO and TRAA require single-sampled scene depth.
    const scenePass = own(pass(scene, camera, {samples: 0}))
    this.scenePass = scenePass
    const renderScene = scenePass.updateBefore.bind(scenePass)
    // The wireframe flood draws into targets of its own right after the scene pass, with the same camera, but only while it is enabled
    const flood = own(new WireframeFloodPass(renderer, scene as Scene, camera))
    scenePass.updateBefore = frame => {
      const reflect = () => {
        renderFloorReflection({
          camera,
          mrt: scenePass.getMRT(),
          renderer,
          resolutionScale: reflectionResolutionScale,
          scene: scene as Scene,
          target: scenePass.renderTarget,
        })
      }
      // The reflection sees what the camera’s pass sees.
      if (renderer instanceof GalleryRenderer) {
        renderer.prepass(scene, camera, reflect)
      } else {
        reflect()
      }
      const result = renderScene(frame)
      flood.draw()
      return result
    }
    if (heavy || antiAliasing === 'traa') {
      const outputs = mrt({
        output,
        ...heavy ? {normal: normalView} : {},
        ...heavy && indirectLight ? {diffuseColor} : {},
        ...antiAliasing === 'traa' ? {velocity} : {},
      })
      // The geometry buffers blend by their own alpha. Every material writes them with alpha 1, which overwrites like before; a soft sprite can write alpha 0 through its `mrtNode` (see `TransparentSpriteOutputsNode`) to leave the normal and motion of what is behind it alone, which the ambient occlusion and the temporal resolve read.
      for (const name of ['normal', 'velocity', 'diffuseColor']) {
        outputs.setBlendMode(name, new BlendMode(NormalBlending))
      }
      scenePass.setMRT(outputs)
    }
    const depth = scenePass.getTextureNode('depth')
    let current: Node<'vec4'> = scenePass.getTextureNode('output')
    if (heavy) {
      const normal = scenePass.getTextureNode('normal')
      // The denoise node’s declaration lacks the node extensions every other node has.
      const smooth = (input: Node<'vec4'>) => own(denoise(input, depth, normal, camera)) as unknown as Node<'vec4'>
      if (custom?.ambientOcclusion ?? true) {
        const ambientOcclusion = own(ao(depth, normal, camera))
        ambientOcclusion.resolutionScale = ambientOcclusionResolutionScale
        tune(ambientOcclusion.radius, 'ambientOcclusionRadius', contactDarkening ? 0.18 : 0.3)
        tune(ambientOcclusion.thickness, 'ambientOcclusionThickness', contactDarkening ? 0.6 : 1)
        tune(ambientOcclusion.scale, 'ambientOcclusionScale', contactDarkening ? 1.18 : 0.85)
        tune(ambientOcclusion.samples, 'ambientOcclusionSamples', ambientOcclusionSamples)
        current = current.mul(vec4(vec3(ambientOcclusion.getTextureNode().r), 1))
      }
      if (indirectLight && camera instanceof PerspectiveCamera) {
        const bounces: Array<Node<'vec3'>> = []
        if (custom?.screenSpaceIndirectLight ?? true) {
          // The light the lit scene bounces onto nearby surfaces, tinted by their diffuse color. Its temporal noise resolves in TRAA.
          const indirect = own(ssgi(scenePass.getTextureNode('output'), depth, normal, camera))
          tune(indirect.sliceCount, 'screenSpaceIndirectLightSlices', 3)
          tune(indirect.stepCount, 'screenSpaceIndirectLightSteps', 16)
          tune(indirect.giIntensity, 'screenSpaceIndirectLightIntensity', 4)
          tune(indirect.radius, 'screenSpaceIndirectLightRadius', 12)
          indirect.useTemporalFiltering = antiAliasing === 'traa'
          // Without TRAA, nothing averages the per-pixel samples, so their fireflies are clamped and a spatial pass smooths them instead.
          bounces.push(antiAliasing === 'traa' ? indirect.getGINode().rgb : smooth(vec4(indirect.getGINode().rgb.min(0.3), 1)).rgb)
        }
        if (custom?.voxelIndirectLight ?? true) {
          // Voxel cone tracing adds the bounces from what is off screen or hidden, which the screen-space pass cannot see. Faint, since it brightens far more than SSGI.
          const voxel = own(vxgi(depth, normal, scene as Scene, camera, 256))
          tune({
            set value(count: number) {
              voxel.bounces = count
            },
          }, 'voxelIndirectLightBounces', 2)
          tune(voxel.giIntensity, 'voxelIndirectLightIntensity', 0.05)
          voxel.useTemporalFiltering = antiAliasing === 'traa'
          bounces.push(voxel.getGINode().rgb)
        }
        if (bounces.length > 0) {
          current = vec4(current.rgb.add(scenePass.getTextureNode('diffuseColor').rgb.mul(bounces.reduce((sum, bounce) => sum.add(bounce)))), current.a)
        }
      }
      let sun: DirectionalLight | undefined
      scene.traverse(object => {
        if (!sun && object instanceof DirectionalLight && object.castShadow) {
          sun = object
        }
      })
      if (custom?.contactShadows && sun) {
        // Marches a short way toward the sun from every pixel, which darkens the small contacts the shadow map is too coarse for.
        const contact = own(sss(depth, camera, sun))
        tune(contact.maxDistance, 'contactShadowDistance', 0.1)
        tune(contact.thickness, 'contactShadowThickness', 0.01)
        tune(contact.shadowIntensity, 'contactShadowIntensity', 0.7)
        tune(contact.quality, 'contactShadowQuality', 1)
        contact.useTemporalFiltering = antiAliasing === 'traa'
        const shadow = custom.contactShadowDenoise ? smooth(contact.getTextureNode()) : contact.getTextureNode()
        current = vec4(current.rgb.mul(shadow.r), current.a)
      }
      if (volumetricLight && sun && camera instanceof PerspectiveCamera) {
        // Raymarches the sun’s shadow map through the air at full resolution; a plain Gaussian blur smooths the march, where an edge-preserving one would posterize it.
        const rays = own(godrays(depth, camera, sun))
        tune(rays.density, 'volumetricLightDensity', 8)
        tune(rays.maxDensity, 'volumetricLightMaxDensity', 3)
        tune(rays.raymarchSteps, 'volumetricLightSteps', 120)
        rays.resolutionScale = 1
        const blurred = own(gaussianBlur(rays.getTextureNode(), vec2(1), 3))
        // The addons default to 8-bit targets, which quantize the faint ray intensities into visible steps.
        const raysTargets = rays as unknown as {_godraysRenderTarget: RenderTarget}
        const blurTargets = blurred as unknown as {
          _horizontalRT: RenderTarget
          _verticalRT: RenderTarget
        }
        for (const target of [raysTargets._godraysRenderTarget, blurTargets._horizontalRT, blurTargets._verticalRT]) {
          target.texture.type = HalfFloatType
        }
        current = vec4(depthAwareBlend(convertToTexture(current), blurred.getTextureNode(), depth, camera, {
          blendColor: sun.color,
          edgeRadius: 2,
          edgeStrength: 2,
        }).rgb, current.a)
      }
    }
    // Native pixel color + native depth -> isolated background -> aperture gather -> composite. No temporal color or post-TRAA depth mask may enter this branch.
    let background: Node<'float'> = float(0)
    if (focus && camera instanceof PerspectiveCamera) {
      const amount = uniform(0).onRenderUpdate(focus.amount)
      const distance = uniform(1).onRenderUpdate(focus.distance)
      const proximity = uniform(0).onRenderUpdate(focus.proximity)
      const blur = uniform(1).onRenderUpdate(focus.blur ?? (() => 1))
      const bokeh = own(new KnotBokeh(current, scenePass.getViewZNode(), {
        amount,
        distance,
        radius: proximity.pow3().mul(26).add(8).mul(blur),
        enabled: () => focus.amount() > 0,
      }))
      current = bokeh.outputNode
      background = bokeh.backgroundNode
    }
    if (heavy) {
      // The canvas is opaque, so alpha carries the inspection bloom mask through the antialiasing resolve. The mask is still applied BEFORE temporal reconstruction, never as a raw, jittered stencil over antialiased color.
      current = vec4(current.rgb, float(1).sub(background))
    }
    // Own the materialized composite explicitly; Three's TRAANode, SMAANode and GaussianBlurNode do not dispose an implicit RTT.
    let composite: ReturnType<typeof rtt> | undefined
    const materialize = () => {
      composite = own(rtt(current, null, null, {depthBuffer: false}))
      composite.name = 'galleryComposite'
      return composite
    }
    if (antiAliasing === 'traa') {
      const temporal = own(traa(materialize(), depth, scenePass.getTextureNode('velocity'), camera))
      // The resolve is an opaque colorNode material, which forces alpha to 1. Without blending it is no longer opaque and keeps the resolved mask.
      ;(temporal as typeof temporal & {_resolveMaterial: NodeMaterial})._resolveMaterial.blending = NoBlending
      // The native accessor exists in r186 but is missing from its declaration file.
      current = (temporal as typeof temporal & {getTextureNode: () => TextureNode}).getTextureNode()
    } else if (antiAliasing === 'smaa') {
      // Like TRAA, SMAA expects linear color before the output transform.
      current = own(smaa(materialize())).getTextureNode()
    }
    if (heavy && (custom?.bloom ?? true)) {
      let mask: Node<'float'> = current.a.saturate()
      if (antiAliasing === 'traa' && composite) {
        // TRAA clips only RGB, so the resolved mask can keep stale history after focus changes. The current mask, dilated by about 2 px, keeps the antialiased edge but never lets glow back onto distant background.
        const source = composite
        const reach = vec2(1.5).div(vec2(source.size(int(0)) as Node<'uvec2'>))
        let near: Node<'float'> = source.a
        for (const x of [-1, 0, 1]) {
          for (const y of [-1, 0, 1]) {
            if (x || y) {
              near = max(near, source.sample(uv().add(reach.mul(vec2(x, y)))).a)
            }
          }
        }
        mask = min(mask, near)
      }
      // Bloom MUST read the resolved image. Its hard luminance threshold and half-resolution downsample turn TRAA's subpixel jitter on small HDR features into frame-to-frame halo changes, and TRAA's variance clipping cannot calm such smooth, low-frequency flicker.
      const glow = own(bloom(current, 0.18, 0.25, 1))
      tune(glow.strength, 'bloomStrength', 0.18)
      tune(glow.radius, 'bloomRadius', 0.25)
      tune(glow.threshold, 'bloomThreshold', 1)
      // Stock high pass, but brightness-capped: a subpixel specular hit (clearcoat or glint on a rotating knot) would otherwise flash a full halo whenever it lands on a pixel.
      glow.highPassFn = ({input, threshold, smoothWidth}) => {
        const value = luminance(input.rgb)
        const capped = input.rgb.mul(min(float(1), float(bloomLuminanceCap).div(max(value, 1e-4))))
        return vec4(capped.mul(smoothstep(threshold, threshold.add(smoothWidth), value)), 1)
      }
      current = vec4(current.rgb.add(glow.rgb.mul(mask)), 1)
    } else if (heavy) {
      // Without glow, the inspection mask in alpha has nothing left to hold back.
      current = vec4(current.rgb, 1)
    }
    if (heavy) {
      const resolved = current
      const zoomEnabled = () => zoom() > 0
      // With no AA, only the blur needs a texture; keep the sharp path inline and skip its RTT outside zoom.
      const zoomSource = antiAliasing ? convertToTexture(resolved) : own(new ConditionalTexture(resolved, zoomEnabled))
      if (!antiAliasing) {
        zoomSource.name = 'zoomSource'
      }
      const zoomAmount = uniform(0).onRenderUpdate(zoom)
      const zoomBlur = own(new ZoomBlur(zoomSource, zoomAmount, zoomEnabled))
      current = tiltShift(resolved, zoomBlur, zoomAmount)
      const edge = smoothstep(float(0.26), float(0.78), length(screenUV.sub(0.5)))
      const vignette = uniform(0.2)
      tune(vignette, 'vignette', 0.2)
      current = current.mul(vec4(vec3(float(1).sub(edge.mul(vignette))), 1))
    }
    current = flood.compose(current)
    if ((custom ? custom.dither : volumetricLight) && heavy) {
      // Dithers by half an 8-bit step in display space, so the smooth, dark gradients of the sun shafts don’t band.
      this.outputColorTransform = false
      current = renderOutput(current)
      current = vec4(current.rgb.add(interleavedGradientNoise(screenCoordinate.xy).sub(0.5).div(255)), current.a)
    }
    this.outputNode = current
    if (tuned) {
      this.unsubscribe = subscribeTunedGraphics(state => {
        for (const [node, key] of bindings) {
          node.value = state[key]
        }
      })
    }
  }

  override dispose() {
    super.dispose()
    this.unsubscribe?.()
    for (const effect of this.effects.toReversed()) {
      effect.dispose()
    }
    this.effects.length = 0
  }
}
