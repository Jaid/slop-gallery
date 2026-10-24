/** key that toggles the free-flying camera with `?development` */
export const flyModeKey = 'KeyF'

/** Whether the player flies, read by the Player without a React subscription. */
export const flyMode = {active: false}

/** Starts or stops flying, returning whether the player flies now. */
export function toggleFlyMode() {
  flyMode.active = !flyMode.active
  return flyMode.active
}
