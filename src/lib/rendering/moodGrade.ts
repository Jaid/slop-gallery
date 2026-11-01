import type {MoodGrade} from '../moods/base/Mood.ts'
import type {Node} from 'three/webgpu'

import {luminance, mix, uniform, vec4} from 'three/tsl'
import {Color, SRGBColorSpace, Vector3} from 'three/webgpu'

/** how much of the frame the gradient map replaces: the mood’s strength times how far it has come */
const amount = uniform(0)
const shadow = uniform(new Vector3)
const midtone = uniform(new Vector3)
const highlight = uniform(new Vector3)
const color = new Color
const rgb = {
  r: 0,
  g: 0,
  b: 0,
}
const paint = (target: {value: Vector3}, hex: string) => {
  color.set(hex).getRGB(rgb, SRGBColorSpace)
  target.value.set(rgb.r, rgb.g, rgb.b)
}

/** Shows `grade` at `progress` (0–1) of its strength in every frame that {@link gradeMood} passes, or nothing without one. */
export function paintMoodGrade(grade: MoodGrade | undefined, progress: number) {
  amount.value = grade ? grade.strength * progress : 0
  if (!grade) {
    return
  }
  paint(shadow, grade.shadow)
  paint(midtone, grade.midtone)
  paint(highlight, grade.highlight)
}

/**
 * Lays the current mood’s gradient map over `frame`, a color in display space, after the output transform: its luminance picks a color from the shadow over the midtone to the highlight, which replaces part of the frame’s own color.
 * A gradient map is display-referred: before tone mapping, every lamp and highlight would sit far past its highlight color. It is an artistic grade on top of the tone mapping, which only brings the HDR frame into the screen’s range and stays as it is.
 */
export function gradeMood(frame: Node<'vec4'>): Node<'vec4'> {
  const tone = luminance(frame.rgb).saturate()
  const lower = mix(shadow, midtone, tone.mul(2).saturate())
  const mapped = mix(lower, highlight, tone.mul(2).sub(1).saturate())
  return vec4(mix(frame.rgb, mapped, amount), frame.a)
}
