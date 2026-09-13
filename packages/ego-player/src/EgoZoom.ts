import type {Camera} from 'three/webgpu'

import {Easing, Tween} from '@tweenjs/tween.js'
import {PerspectiveCamera} from 'three/webgpu'

type ZoomTweenState = {fov: number}

/** Owns only its own FOV writes; inspection cameras can take over without a stale restore. */
export default class EgoZoom {
  private camera?: PerspectiveCamera
  private original?: number
  private target?: number
  private time = 0
  private tween?: Tween<ZoomTweenState>
  private written?: number

  reset() {
    this.tween?.stop()
    if (this.camera && this.original !== undefined && this.camera.fov === this.written) {
      this.camera.fov = this.original
      this.camera.updateProjectionMatrix()
    }
    this.clear()
  }

  update(camera: Camera, held: boolean, factor: number, transition: number, delta: number) {
    if (this.camera && (camera !== this.camera || this.camera.fov !== this.written)) {
      this.reset()
    }
    if (!(camera instanceof PerspectiveCamera)) {
      this.reset()
      return
    }
    if (!this.camera) {
      if (!held) {
        return
      }
      this.camera = camera
      this.original = camera.fov
      this.written = camera.fov
    }
    const target = held ? this.original! / factor : this.original!
    if (target !== this.target) {
      this.retarget(target, transition)
    }
    if (Number.isFinite(delta) && delta > 0) {
      this.time += delta * 1000
      this.tween?.update(this.time)
    }
  }

  private clear() {
    this.camera = undefined
    this.original = undefined
    this.target = undefined
    this.tween = undefined
    this.written = undefined
  }

  private retarget(target: number, transition: number) {
    this.tween?.stop()
    this.tween = undefined
    this.target = target
    if (!this.camera || this.original === undefined) {
      return
    }
    if (transition === 0 || this.camera.fov === target) {
      this.write(target)
      if (target === this.original) {
        this.clear()
      }
      return
    }
    const state = {fov: this.camera.fov}
    const tween = new Tween(state, false)
      .to({fov: target}, transition * 1000)
      .easing(Easing.Cubic.InOut)
      .onUpdate(({fov}) => {
        if (this.tween === tween) {
          this.write(fov)
        }
      })
      .onComplete(() => {
        if (this.tween !== tween) {
          return
        }
        this.tween = undefined
        this.write(target)
        if (target === this.original) {
          this.clear()
        }
      })
    this.tween = tween
    tween.start(this.time)
  }

  private write(fov: number) {
    if (!this.camera) {
      return
    }
    if (this.camera.fov !== fov) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
    this.written = fov
  }
}
