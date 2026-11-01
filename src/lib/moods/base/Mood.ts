import type AmbienceLoop from '#src/lib/audio/ambience/base/AmbienceLoop.ts'

/** what a kind of light is multiplied by while a mood holds: a color, whose channels pass that share of the light, and a gain on top */
export type MoodLight = {
  color: string
  gain: number
}

/** a gradient map in display space: the frame’s luminance picks a color from `shadow` over `midtone` to `highlight`, which replaces `strength` of the frame’s own color */
export type MoodGrade = {
  highlight: string
  midtone: string
  shadow: string
  strength: number
}

/**
 * A spell over the whole world while the player holds a prop that carries it: the finished frame takes on a gradient map, the lights are tinted and a loop sounds, centered, all fading in and out together.
 * Colors are sRGB hex.
 */
export default abstract class Mood {
  /** ambient, hemisphere and directional lights: the fill and the sun */
  abstract readonly fill: MoodLight
  abstract readonly grade: MoodGrade
  abstract readonly id: string
  /** point and spot lights: the rooms’ lamps */
  abstract readonly lamps: MoodLight
  abstract readonly title: string

  /** the loop that sounds while the mood holds, made each time it begins */
  abstract createAmbience(): AmbienceLoop
}
