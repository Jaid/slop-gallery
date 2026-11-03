import type AmbienceLoop from '../audio/ambience/base/AmbienceLoop.ts'
import type {AudioOutput} from '../audio/proceduralAudio.ts'
import type Mood from './base/Mood.ts'
import type {MoodFade, MoodLight} from './base/Mood.ts'
import type {Light} from 'three/webgpu'

import {clamp} from 'math'
import {Color} from 'three/webgpu'

import {noTint} from '../rendering/lightLevels.ts'
import {paintMoodGrade} from '../rendering/moodGrade.ts'

/** seconds a mood takes to come over the world, slowly, and to leave it again, quickly, once its prop is thrown or dropped, unless the mood has a pace of its own */
export const moodFade: MoodFade = {
  in: 4,
  out: 0.25,
}

type Lamp = Light & {
  isPointLight?: boolean
  isSpotLight?: boolean
}

/** Whether a light is one of the rooms’ lamps, rather than fill or daylight, which comes through windows even as a point light. */
const isLamp = (light: Light) => {
  const lamp = light as Lamp
  return Boolean(lamp.isPointLight || lamp.isSpotLight) && !lamp.userData.daylight
}

/**
 * Blends one mood at a time over the world: the mood showing fades in while it is the one asked for and out otherwise, and only once it is gone does the next one fade in, so two moods never mix.
 * It paints the render pipeline’s gradient map, keeps the tints of the lamps and of the fill and sounds the mood’s loop, all at the same eased strength.
 */
export default class MoodMixer {
  /** what the fill and daylight are multiplied by now */
  readonly fillTint = new Color(1, 1, 1)
  /** what the lamps are multiplied by now */
  readonly lampTint = new Color(1, 1, 1)
  private ambience?: AmbienceLoop
  private current: Mood | null = null
  /** the level the loop was last set to */
  private level = 0
  private progress = 0

  /** how strongly the mood shows, 0–1, eased in and out */
  get amount() {
    return this.progress * this.progress * (3 - 2 * this.progress)
  }

  /** the mood showing, also while it fades in or out */
  get mood() {
    return this.current
  }

  /** Lets the mood go at once, with its loop, without waiting for its fade. */
  cut() {
    if (!this.current) {
      return
    }
    this.progress = 0
    this.release(0.3)
    this.paint()
  }

  dispose() {
    this.cut()
  }

  /** Shows `target` in full at once, without waiting for any fade, sounding its loop on `output` once there is one; with none, lets the mood showing go at once. */
  snap(target: Mood | null, output?: AudioOutput) {
    if (this.current !== target) {
      this.cut()
    }
    if (!target) {
      return
    }
    this.current = target
    this.progress = 1
    this.update(target, 0, output)
  }

  /** What a light is multiplied by now: the lamps’ tint or the fill’s, or nothing for a light with `userData.untinted`, which keeps its own color through every mood, like a fusion portal’s glow. */
  tintOf(light: Light) {
    if (light.userData.untinted) {
      return noTint
    }
    return isLamp(light) ? this.lampTint : this.fillTint
  }

  /** Moves `delta` seconds toward `target`, at the pace of the mood showing, sounding the mood’s loop on `output` once there is one. */
  update(target: Mood | null, delta: number, output?: AudioOutput) {
    if (!this.current) {
      if (!target) {
        return
      }
      this.current = target
    }
    const rising = this.current === target
    const fade = this.current.fade ?? moodFade
    this.progress = clamp(this.progress + delta / (rising ? fade.in : -fade.out), 0, 1)
    this.paint()
    if (!rising && this.progress === 0) {
      this.release()
      return
    }
    if (output && !this.ambience) {
      this.ambience = this.current.createAmbience()
      this.ambience.setLevel(0)
      this.ambience.start(output)
    }
    const level = this.amount
    if (this.ambience && level !== this.level) {
      this.level = level
      this.ambience.setLevel(level, 0.05)
    }
  }

  private paint() {
    const {amount, current} = this
    paintMoodGrade(current?.grade, amount)
    tint(this.lampTint, current?.lamps, amount)
    tint(this.fillTint, current?.fill, amount)
  }

  /** Forgets the mood, which has faded out, and stops its loop, which has gone silent with it. */
  private release(fade?: number) {
    this.ambience?.stop(fade)
    this.ambience = undefined
    this.level = 0
    this.current = null
  }
}

const full = new Color
/** Sets `target` to white blended toward the light’s full tint by `amount`. */
function tint(target: Color, light: MoodLight | undefined, amount: number) {
  target.setRGB(1, 1, 1)
  if (light) {
    target.lerp(full.set(light.color).multiplyScalar(light.gain), amount)
  }
}
