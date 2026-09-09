import type {WebGPURendererParameters} from 'three/webgpu'

import {Renderer, StandardNodeLibrary, WebGPUBackend} from 'three/webgpu'

export type WebgpuRendererOptions = Omit<WebGPURendererParameters, 'forceWebGL' | 'getFallback'>

/** Native WebGPU only: adapter/device initialization errors propagate without creating a WebGL context. */
export class WebgpuRenderer extends Renderer {
  declare backend: WebGPUBackend
  readonly isWebGPURenderer = true
  override library = new StandardNodeLibrary

  constructor(options: WebgpuRendererOptions = {}) {
    super(new WebGPUBackend(options), {
      ...options,
      getFallback: null,
    })
  }
}
