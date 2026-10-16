import type {WebgpuRendererOptions} from 'three-fiber-game'
import type {Camera, Object3D, Scene} from 'three/webgpu'

import {WebgpuRenderer} from 'three-fiber-game'

import LanternLightNode from '#src/lib/materials/lights/LanternLightNode.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

/** Instrument real lifecycle operations without adding an implicit scene prewarm. */
class GalleryRenderer extends WebgpuRenderer {
  private initialization?: Promise<this>

  constructor(options: WebgpuRendererOptions) {
    super({
      ...options,
      alpha: false,
      antialias: false,
      trackTimestamp: telemetry !== null,
    })
    LanternLightNode.register(this.library)
  }

  override compileAsync(scene: Object3D, camera: Camera, targetScene?: Scene | null) {
    return telemetry ? telemetry.wrap('three.compile', () => super.compileAsync(scene, camera, targetScene)) : super.compileAsync(scene, camera, targetScene)
  }

  override init(): Promise<this> {
    this.initialization ??= telemetry ? telemetry.wrap('three.init', () => super.init()) : super.init()
    return this.initialization
  }
}

export const createGalleryRenderer = (options: WebgpuRendererOptions) => new GalleryRenderer(options)
