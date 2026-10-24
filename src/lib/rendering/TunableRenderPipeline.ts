import type {GalleryRenderPipelineOptions} from './GalleryRenderPipeline.ts'
import type {Camera, Object3D, Renderer} from 'three/webgpu'

import {getTunedGraphics, subscribeTunedGraphics} from './customGraphics.ts'
import GalleryRenderPipeline from './GalleryRenderPipeline.ts'

/** The gallery pipeline of `?development`, built from the tuning panel’s values, which stay after hiding it, and following their uniforms live. */
export default class TunableRenderPipeline extends GalleryRenderPipeline {
  private readonly unsubscribe: () => void

  constructor(renderer: Renderer, scene: Object3D, camera: Camera, options: Omit<GalleryRenderPipelineOptions, 'settings'>) {
    super(renderer, scene, camera, {
      ...options,
      settings: getTunedGraphics(),
    })
    this.unsubscribe = subscribeTunedGraphics(settings => {
      for (const [node, key] of this.uniforms) {
        node.value = settings[key]
      }
    })
  }

  override dispose() {
    this.unsubscribe()
    super.dispose()
  }
}
