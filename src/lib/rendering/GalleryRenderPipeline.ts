import type {AntiAliasing} from './antiAliasing.ts'
import type {Camera, Node, NodeMaterial, Object3D, Renderer, TextureNode} from 'three/webgpu'

import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {smaa} from 'three/addons/tsl/display/SMAANode.js'
import {traa} from 'three/addons/tsl/display/TRAANode.js'
import {convertToTexture, float, int, length, max, min, mrt, normalView, output, pass, rtt, screenUV, smoothstep, uniform, uv, vec2, vec3, vec4, velocity} from 'three/tsl'
import {NoBlending, PerspectiveCamera, RenderPipeline} from 'three/webgpu'

import ConditionalTexture from './ConditionalTexture.ts'
import KnotBokeh from './KnotBokeh.ts'
import tiltShift from './tiltShift.ts'
import ZoomBlur from './ZoomBlur.ts'

export type GalleryRenderPipelineOptions = {
  antiAliasing?: AntiAliasing
  contactDarkening?: boolean
  focus?: {
    amount: () => number
    distance: () => number
    proximity: () => number
  }
  heavy?: boolean
  zoom?: () => number
}

/** All depth-dependent work stays in the current frame; one antialiasing resolve (TRAA by default) antialiases the finished composite. */
export default class GalleryRenderPipeline extends RenderPipeline {
  readonly scenePass: ReturnType<typeof pass>
  private readonly effects: Array<{dispose: () => void}> = []

  constructor(renderer: Renderer, scene: Object3D, camera: Camera, {antiAliasing = 'traa', contactDarkening = false, focus, heavy = true, zoom = () => 0}: GalleryRenderPipelineOptions = {}) {
    super(renderer)
    const own = <T extends {dispose: () => void}>(effect: T) => {
      this.effects.push(effect)
      return effect
    }
    // GTAO and TRAA require single-sampled scene depth.
    const scenePass = own(pass(scene, camera, {samples: 0}))
    this.scenePass = scenePass
    if (heavy || antiAliasing === 'traa') {
      scenePass.setMRT(mrt({
        output,
        ...heavy ? {normal: normalView} : {},
        ...antiAliasing === 'traa' ? {velocity} : {},
      }))
    }
    const depth = scenePass.getTextureNode('depth')
    let current: Node<'vec4'> = scenePass.getTextureNode('output')
    if (heavy) {
      const ambientOcclusion = own(ao(depth, scenePass.getTextureNode('normal'), camera))
      ambientOcclusion.resolutionScale = 0.75
      ambientOcclusion.radius.value = contactDarkening ? 0.18 : 0.3
      ambientOcclusion.thickness.value = contactDarkening ? 0.6 : 1
      ambientOcclusion.scale.value = contactDarkening ? 1.18 : 0.85
      ambientOcclusion.samples.value = 16
      current = current.mul(vec4(vec3(ambientOcclusion.getTextureNode().r), 1))
    }
    // Native pixel color + native depth -> isolated background -> aperture gather -> composite. No temporal color or post-TRAA depth mask may enter this branch.
    let background: Node<'float'> = float(0)
    if (focus && camera instanceof PerspectiveCamera) {
      const amount = uniform(0).onRenderUpdate(focus.amount)
      const distance = uniform(1).onRenderUpdate(focus.distance)
      const proximity = uniform(0).onRenderUpdate(focus.proximity)
      const bokeh = own(new KnotBokeh(current, scenePass.getViewZNode(), {
        amount,
        distance,
        radius: proximity.pow3().mul(26).add(8),
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
      // eslint-disable-next-line no-underscore-dangle
      ;(temporal as typeof temporal & {_resolveMaterial: NodeMaterial})._resolveMaterial.blending = NoBlending
      // The native accessor exists in r186 but is missing from its declaration file.
      current = (temporal as typeof temporal & {getTextureNode: () => TextureNode}).getTextureNode()
    } else if (antiAliasing === 'smaa') {
      // Like TRAA, SMAA expects linear color before the output transform.
      current = own(smaa(materialize())).getTextureNode()
    }
    if (heavy) {
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
      current = vec4(current.rgb.add(glow.rgb.mul(mask)), 1)
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
      current = current.mul(vec4(vec3(float(1).sub(edge.mul(0.2))), 1))
    }
    this.outputNode = current
  }

  override dispose() {
    super.dispose()
    for (const effect of this.effects.toReversed()) {
      effect.dispose()
    }
    this.effects.length = 0
  }
}
