import type {SoundTransformer} from '#src/lib/audio/transformers/TransformerChain.ts'
import type {MoodAmbience, MoodFade, MoodGrade, MoodLight} from './base/Mood.ts'

import Mood from './base/Mood.ts'

export type RoomMoodOptions = {
  ambience?: MoodAmbience
  /** how fast the mood comes and goes, {@link roomMoodFade} by default */
  fade?: MoodFade
  fill?: MoodLight
  grade?: MoodGrade
  /** unique among every room’s moods, usually the room’s id */
  id: string
  lamps?: MoodLight
  title: string
  /** what every sound of the world passes through in the room, like the `reverberation` of what it is built of */
  transformer?: SoundTransformer
}

/** seconds a room’s mood takes to come and to go as the listener walks in and out: quickly, so its acoustics follow them through the doorway, and alike both ways, so the moods of two rooms cross over evenly */
export const roomMoodFade: MoodFade = {
  in: 0.5,
  out: 0.5,
}

/** A mood that holds while the listener is in a room that names it among its moods, beneath whatever is cast over the world, made of what the room contributes, like its acoustics. */
export default class RoomMood extends Mood {
  override readonly ambience: MoodAmbience | undefined
  override readonly fade: MoodFade
  override readonly fill: MoodLight | undefined
  override readonly grade: MoodGrade | undefined
  readonly id: string
  override readonly lamps: MoodLight | undefined
  readonly title: string
  override readonly transformer: SoundTransformer | undefined

  constructor({id, title, ambience, fade = roomMoodFade, fill, grade, lamps, transformer}: RoomMoodOptions) {
    super()
    this.id = id
    this.title = title
    this.ambience = ambience
    this.fade = fade
    this.fill = fill
    this.grade = grade
    this.lamps = lamps
    this.transformer = transformer
  }
}
