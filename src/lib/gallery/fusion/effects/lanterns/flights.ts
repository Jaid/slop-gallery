import type {PortalOffset} from '../base/portalOffset.ts'

/** a jack-o’-lantern that pops out of a fusion’s portal as the result flips out */
export type PoppingLantern = {
  /** seconds after the result flipped out that its candle is blown out */
  blowOut: number
  /** seconds after the result flipped out that it pops out */
  delay: number
  /** sets its bobbing, swaying and flickering apart from the others’, 0–1 */
  phase: number
  /** the note it pops out with, in hertz */
  pitch: number
  /** how wide it is, in meters */
  size: number
  /** where it floats to */
  spot: PortalOffset
  /** seconds after the result flipped out that it winks, if it does */
  wink?: number
}

/** seconds a lantern takes to fly out to its spot */
export const flyingOut = 0.45
/** seconds the smoke of a blown-out lantern rises before it is gone */
export const smoking = 0.95
const degrees = Math.PI / 180
/** where a lantern floats to: an angle around the portal’s middle in the wall’s plane and how far out from it, and how far out into the room */
const spot = (angle: number, distance: number, out: number): PortalOffset => [Math.cos(angle * degrees) * distance, Math.sin(angle * degrees) * distance, out]

/** Five jack-o’-lanterns popping out of the portal one after another, each with a note of a kooky D minor tune, to float round it in an arc clear of the result’s flight, grinning and flickering, two of them winking, until their candles are blown out one after another and they vanish in a wisp of smoke. */
export const poppingLanterns: ReadonlyArray<PoppingLantern> = [{
  delay: 0.05,
  spot: spot(168, 1.2, 0.45),
  size: 0.5,
  phase: 0,
  pitch: 293.66,
  blowOut: 1.7,
}, {
  delay: 0.14,
  spot: spot(130, 1.15, 0.6),
  size: 0.42,
  phase: 0.37,
  pitch: 349.23,
  wink: 1.05,
  blowOut: 1.9,
}, {
  delay: 0.23,
  spot: spot(50, 1.15, 0.6),
  size: 0.46,
  phase: 0.71,
  pitch: 440,
  blowOut: 2.1,
}, {
  delay: 0.32,
  spot: spot(12, 1.2, 0.45),
  size: 0.54,
  phase: 0.13,
  pitch: 415.3,
  wink: 1.35,
  blowOut: 2.3,
}, {
  delay: 0.41,
  spot: spot(-90, 0.72, 0.8),
  size: 0.4,
  phase: 0.53,
  pitch: 587.33,
  blowOut: 2.5,
}]
