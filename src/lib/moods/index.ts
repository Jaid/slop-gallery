import HalloweenMood from './HalloweenMood.ts'
import HorrorMood from './HorrorMood.ts'
import SpookMood from './SpookMood.ts'

export const halloweenMood = new HalloweenMood
export const horrorMood = new HorrorMood
export const spookMood = new SpookMood
export const moods = [halloweenMood, horrorMood, spookMood] as const

export type {default as Mood} from './base/Mood.ts'
