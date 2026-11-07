import {uniform} from 'three/tsl'
import {Vector2} from 'three/webgpu'

/**
 * A blow the whole view takes, like a fusion’s result flipping out of its portal: the bloom swells, the image kicks inward and shakes, and a ring runs out over the screen from a point, bending the view and splitting it into its colors.
 * Whoever deals it writes these every frame; at rest every one is neutral. Only heavy graphics build it in.
 */
export const screenImpact = {
  /** how far the colors split along the ring and around it, in screen heights */
  aberration: uniform(0),
  /** what the bloom is multiplied by */
  bloom: uniform(1),
  /** what the bloom’s brightness cap is multiplied by */
  cap: uniform(1),
  /** where the blow lands on the screen, in UV */
  center: uniform(new Vector2(0.5, 0.5)),
  /** how far the image is scaled in toward the center, as a share */
  punch: uniform(0),
  /** how far the ring has run out from the center, in screen heights */
  ring: uniform(0),
  /** how far the ring bends the view, in screen heights */
  ringStrength: uniform(0),
  /** how far the image is shaken this frame, in screen heights */
  shake: uniform(new Vector2),
}

/** whether the impact moves anything this frame, which lets the pipeline sample the view a second time */
export function impactActive() {
  return screenImpact.aberration.value > 0 || screenImpact.punch.value !== 0 || screenImpact.ringStrength.value > 0 || screenImpact.shake.value.lengthSq() > 0
}

/** Lays the impact at rest. */
export function resetImpact() {
  screenImpact.aberration.value = 0
  screenImpact.bloom.value = 1
  screenImpact.cap.value = 1
  screenImpact.punch.value = 0
  screenImpact.ring.value = 0
  screenImpact.ringStrength.value = 0
  screenImpact.shake.value.set(0, 0)
}
