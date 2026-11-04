import type {PortalOffset} from '../base/portalOffset.ts'

/** a drop of blood that the portal spurts out as the result flips out, or that drips from its bottom afterwards */
export type BloodDrop = {
  /** seconds after the result flipped out that it leaves the portal */
  delay: number
  /** seconds it swells hanging from the portal before it drops, for a drip */
  hang: number
  /** sets its splat’s spatter apart from the others’, 0–1 */
  phase: number
  /** how thick it is, in meters */
  size: number
  /** where it leaves the portal */
  start: PortalOffset
  /** how fast it leaves the portal, in m/s */
  velocity: PortalOffset
}

/** how strongly a drop is pulled down, in m/s² */
export const gravity = 9.81
/** how high above the floor its splat lies, in meters */
export const splatLift = 0.004
/** seconds after the result flipped out that the splats start drying away, the first of them, and how long drying them all takes */
export const drying = {
  start: 2.4,
  stagger: 0.35,
  duration: 0.6,
} as const
/** seconds after the result flipped out that the portal spurts, on two beats of a heart */
export const spurts = [0, 0.42] as const

const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (index: number, seed: number) => (index * goldenRatio + seed) % 1
const between = (index: number, seed: number, low: number, high: number) => low + sequence(index, seed) * (high - low)
/** how many drops each spurt flings out */
const spurted = [70, 46] as const

/** Blood spurting out of the portal toward the room on two heartbeats, the second weaker, in a spray of drops large and small that rain down and splat on the floor, while three drips swell under the portal and fall after them. */
export const bloodDrops: ReadonlyArray<BloodDrop> = [
  ...spurts.flatMap((at, spurt) => Array.from({length: spurted[spurt]}, (_, index): BloodDrop => {
    const seed = spurt * 0.29
    const strength = spurt ? 0.75 : 1
    const large = sequence(index * 31, seed + 0.13) > 0.85
    return {
      delay: at + between(index * 3, seed + 0.41, 0, 0.09),
      hang: 0,
      start: [between(index * 5, seed + 0.67, -0.08, 0.08), between(index * 7, seed + 0.23, -0.08, 0.08), 0.05],
      velocity: [between(index * 11, seed + 0.59, -1.5, 1.5) * strength, between(index * 13, seed + 0.11, 0.3, 2.8) * strength, between(index * 17, seed + 0.83, 1.2, 3.4) * strength],
      size: large ? between(index * 19, seed + 0.37, 0.045, 0.075) : between(index * 19, seed + 0.37, 0.014, 0.036),
      phase: sequence(index * 23, seed + 0.71),
    }
  })),
  ...[[0.75, -0.06], [1.15, 0.09], [1.55, 0.01]].map(([delay, along], index): BloodDrop => ({
    delay,
    hang: 0.4,
    start: [along, -0.34, 0.06],
    velocity: [0, -0.1, 0.05],
    size: 0.04 + index * 0.006,
    phase: 0.3 + index * 0.27,
  })),
]

/** When a drop splats on a floor `floor` meters below the portal’s middle (negative), in seconds after it left the portal, and how fast it hits it, in m/s. `BloodSpray` drops them the same way on the GPU. */
export function bloodLanding({start, velocity}: Pick<BloodDrop, 'start' | 'velocity'>, floor: number) {
  const up = velocity[1]
  const drop = Math.max(0, start[1] - floor - splatLift)
  const landing = (up + Math.sqrt(up * up + 2 * gravity * drop)) / gravity
  return {
    landing,
    speed: Math.hypot(velocity[0], gravity * landing - up, velocity[2]),
  }
}
