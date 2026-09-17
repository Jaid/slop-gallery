import type {Camera} from 'three/webgpu'

import {Easing, Tween} from '@tweenjs/tween.js'
import {PerspectiveCamera} from 'three/webgpu'

export type EgoZoomMode = 'casual' | 'extended' | 'none'
export type EgoZoomTransition = {
  direction: 'forward' | 'retract'
  /** Actual transition duration in seconds, including zero for an immediate change. */
  duration: number
  from: EgoZoomMode
  to: EgoZoomMode
}
export type EgoZoomOptions = {
  /** FOV divisor while zoom is held. Defaults to 2. */
  casualZoomFactor: number
  /** Seconds to enter/leave casual zoom. Defaults to 0.2; zero is instant. */
  casualZoomTransition: number
  /** FOV divisor while zoom and sprint are held at rest. Defaults to 4. */
  extendedZoomFactor: number
  /** Seconds to enter/leave extended zoom. Defaults to 0.5; zero is instant. */
  extendedZoomTransition: number
}

type ZoomTweenState = {
  amount: number
  fov: number
}

/** Owns only its own FOV writes; inspection cameras can take over without a stale restore. */
export default class EgoZoom {
  private amount = 0
  private camera?: PerspectiveCamera
  private mode: EgoZoomMode = 'none'
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
    return this.amount
  }

  update(camera: Camera, mode: EgoZoomMode, options: EgoZoomOptions, delta: number, onTransition?: (transition: EgoZoomTransition) => void) {
    if (this.camera && (camera !== this.camera || this.camera.fov !== this.written)) {
      this.reset()
    }
    if (!(camera instanceof PerspectiveCamera)) {
      return this.reset()
    }
    const held = mode !== 'none'
    if (!this.camera) {
      if (!held) {
        return this.amount
      }
      this.camera = camera
      this.original = camera.fov
      this.written = camera.fov
    }
    const factor = mode === 'extended' ? options.extendedZoomFactor : options.casualZoomFactor
    const target = held ? this.original! / factor : this.original!
    // Leaving extended zoom uses its own duration too, including a direct release to normal FOV.
    const transition = mode === 'extended' || this.mode === 'extended' ? options.extendedZoomTransition : options.casualZoomTransition
    const from = this.mode
    this.mode = mode
    if (target !== this.target) {
      if (camera.fov !== target) {
        onTransition?.({
          from,
          to: mode,
          direction: target < camera.fov ? 'forward' : 'retract',
          duration: transition,
        })
      }
      this.retarget(target, held ? 1 : 0, transition)
    }
    if (Number.isFinite(delta) && delta > 0) {
      this.time += delta * 1000
      this.tween?.update(this.time)
    }
    return this.amount
  }

  private clear() {
    this.amount = 0
    this.camera = undefined
    this.mode = 'none'
    this.original = undefined
    this.target = undefined
    this.tween = undefined
    this.written = undefined
  }

  private retarget(target: number, targetAmount: number, transition: number) {
    this.tween?.stop()
    this.tween = undefined
    this.target = target
    if (!this.camera || this.original === undefined) {
      return
    }
    if (transition === 0 || this.camera.fov === target) {
      this.amount = targetAmount
      this.write(target)
      if (target === this.original) {
        this.clear()
      }
      return
    }
    const state = {
      amount: this.amount,
      fov: this.camera.fov,
    }
    const tween = new Tween(state)
      .to({
        amount: targetAmount,
        fov: target,
      }, transition * 1000)
      .easing(Easing.Quintic.InOut)
      .onUpdate(({amount, fov}) => {
        if (this.tween === tween) {
          this.amount = amount
          this.write(fov)
        }
      })
      .onComplete(() => {
        if (this.tween !== tween) {
          return
        }
        this.tween = undefined
        this.amount = targetAmount
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
