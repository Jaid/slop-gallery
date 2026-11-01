import type {Vec3} from '../../../gallery/types.ts'
import type {AmbienceLoopOptions} from './AmbienceLoop.ts'

import {clamp} from 'math'

import AmbienceLoop from './AmbienceLoop.ts'

export type {NoiseBed, ToneBed} from './AmbienceLoop.ts'
export type AmbienceEmitterOptions = AmbienceLoopOptions & {
  /** full level within `near` meters, fading linearly to silence at `far` */
  hearing: {
    far: number
    near: number
  }
  position: Vec3
  /** the rooms the emitter sounds in; it is disabled while the listener is anywhere else */
  rooms?: ReadonlyArray<string>
}

/**
 * A positional {@link AmbienceLoop}, heard through an HRTF panner at {@link position}, which fades out while the listener is outside its {@link rooms}.
 */
export default abstract class AmbienceEmitter extends AmbienceLoop {
  readonly hearing: AmbienceEmitterOptions['hearing']
  readonly position: Vec3
  readonly rooms?: ReadonlyArray<string>
  private inside = true

  constructor({hearing, position, rooms, ...options}: AmbienceEmitterOptions) {
    super(options)
    this.position = position
    this.hearing = hearing
    this.rooms = rooms
  }

  /** Whether `room` is one the emitter stands in. */
  isInside(room: string) {
    return !this.rooms || this.rooms.includes(room)
  }

  protected override route(level: GainNode, context: BaseAudioContext) {
    const [x, y, z] = this.position
    const panner = new PannerNode(context, {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: this.hearing.near,
      maxDistance: this.hearing.far,
      rolloffFactor: 1,
      positionX: x,
      positionY: y,
      positionZ: z,
    })
    return level.connect(panner)
  }

  /** Disables the emitter while the listener is outside its rooms. */
  setListenerRoom(room: string) {
    const inside = this.isInside(room)
    if (inside === this.inside) {
      return
    }
    this.inside = inside
    this.setLevel(inside ? 1 : 0)
  }

  /** How loud the emitter reaches a listener at `listener` in `room`, 0–1, before {@link gain}; 0 while disabled there. */
  strengthAt(listener: Vec3, room: string) {
    if (!this.isInside(room)) {
      return 0
    }
    const distance = Math.hypot(listener[0] - this.position[0], listener[1] - this.position[1], listener[2] - this.position[2])
    const {near, far} = this.hearing
    const falloff = 1 - clamp((distance - near) / (far - near), 0, 1)
    return falloff
  }
}
