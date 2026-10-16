import type {LanternBounce} from '../../materials/lights/LanternLight.ts'

/**
 * Light the boards around a lamp throw back onto faces it cannot reach directly.
 *
 * It is strong right around the lamp and has mostly faded halfway to the next one, but still keeps far corners from going pitch black.
 */
export const soleLampBounce: LanternBounce = {
  distance: 7,
  radius: 2.5,
  share: 0.05,
}
/** Range and strength of a lamp that is the only light around: a warm pool under each lamp, dimming toward the next. */
export const soleLampReach = {
  // The direct light’s cutoff makes the pools; the wider bounce keeps the dark between them from going black.
  distance: 4.2,
  intensity: 28,
} as const
