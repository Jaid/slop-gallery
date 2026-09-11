import type {Camera} from 'three/webgpu'

import {PerspectiveCamera} from 'three/webgpu'

/** Owns only its own FOV writes; inspection cameras can take over without a stale restore. */
export default class EgoZoom {
  private camera?: PerspectiveCamera
  private original?: number
  private written?: number

  reset() {
    if (this.camera && this.original !== undefined && this.camera.fov === this.written) {
      this.camera.fov = this.original
      this.camera.updateProjectionMatrix()
    }
    this.camera = undefined
    this.original = undefined
    this.written = undefined
  }

  update(camera: Camera, held: boolean, factor: number) {
    if (camera !== this.camera || this.camera.fov !== this.written) {
      this.reset()
    }
    if (!held || !(camera instanceof PerspectiveCamera)) {
      this.reset()
      return
    }
    this.camera = camera
    this.original ??= camera.fov
    const fov = this.original / factor
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    this.written = fov
  }
}
