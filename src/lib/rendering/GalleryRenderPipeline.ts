import type {Camera, Node, Object3D, Renderer, TextureNode} from 'three/webgpu'

import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {gaussianBlur} from 'three/addons/tsl/display/GaussianBlurNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {traa} from 'three/addons/tsl/display/TRAANode.js'
import {float, length, mrt, normalView, output, pass, rtt, screenUV, smoothstep, uniform, vec3, vec4, velocity} from 'three/tsl'
import {PerspectiveCamera, RenderPipeline} from 'three/webgpu'

import KnotBokeh from './KnotBokeh.ts'
import tiltShift from './tiltShift.ts'

export type GalleryRenderPipelineOptions = {
  contactDarkening?: boolean
  focus?: {
    amount: () => number
    distance: () => number
    proximity: () => number
  }
  quality?: boolean
  zoom?: () => number
}

/** All depth-dependent work stays in the current frame; one TRAA resolve antialiases the finished composite. */
export default class GalleryRenderPipeline extends RenderPipeline {
  readonly scenePass: ReturnType<typeof pass>
  private readonly effects: Array<{dispose: () => void}> = []

  constructor(renderer: Renderer, scene: Object3D, camera: Camera, {contactDarkening = false, focus, quality = true, zoom = () => 0}: GalleryRenderPipelineOptions = {}) {
    super(renderer)
    const own = <T extends {dispose: () => void}>(effect: T) => {
      this.effects.push(effect)
      return effect
    }
    // GTAO and TRAA require single-sampled scene depth.
    const scenePass = own(pass(scene, camera, {samples: 0}))
    this.scenePass = scenePass
    if (quality) {
      scenePass.setMRT(mrt({
        output,
        normal: normalView,
        velocity,
      }))
    }
    const depth = scenePass.getTextureNode('depth')
    let current: Node<'vec4'> = scenePass.getTextureNode('output')
    if (quality) {
      const ambientOcclusion = own(ao(depth, scenePass.getTextureNode('normal'), camera))
      ambientOcclusion.resolutionScale = 0.75
      ambientOcclusion.radius.value = contactDarkening ? 0.18 : 0.3
      ambientOcclusion.thickness.value = contactDarkening ? 0.6 : 1
      ambientOcclusion.scale.value = contactDarkening ? 1.18 : 0.85
      ambientOcclusion.samples.value = 16
      current = current.mul(vec4(vec3(ambientOcclusion.getTextureNode().r), 1))
    }
    // Native pixel color + native depth -> isolated background -> aperture gather -> composite.
    // No temporal color or post-TRAA depth mask may enter this branch.
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
    if (quality) {
      // Preserve the existing inspection bloom treatment, but apply its depth mask BEFORE
      // temporal reconstruction, not as a jagged stencil over an already antialiased image.
      const glow = own(bloom(current, 0.18, 0.25, 1))
      current = vec4(current.rgb.add(glow.rgb.mul(float(1).sub(background))), current.a)
      // Own the materialized input explicitly; Three's TRAANode does not dispose an implicit RTT.
      const temporalInput = own(rtt(current, null, null, {depthBuffer: false}))
      temporalInput.name = 'galleryTemporalInput'
      const temporal = own(traa(temporalInput, depth, scenePass.getTextureNode('velocity'), camera))
      // The native accessor exists in r186 but is missing from its declaration file.
      const resolved = (temporal as typeof temporal & {getTextureNode: () => TextureNode}).getTextureNode()
      const zoomAmount = uniform(0).onRenderUpdate(zoom)
      const zoomBlur = own(gaussianBlur(resolved, zoomAmount.mul(0.75), 8, {resolutionScale: 1}))
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
