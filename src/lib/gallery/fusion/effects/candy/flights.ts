import type {PortalOffset} from '../base/portalOffset.ts'

/** the kinds of treats a candy burst flings out: a wrapped candy with its ends twisted into fans, a kernel of candy corn and a scrap of confetti */
export const treatKinds = ['wrapped', 'corn', 'confetti'] as const
export type TreatKind = typeof treatKinds[number]
/** a treat flung out of a fusion’s portal as the result flips out */
export type FlungTreat = {
  /** its color, as a hex color; candy corn has its own */
  color: string
  /** seconds after the result flipped out that it is flung out */
  delay: number
  /** how fast it turns over, in radians per second, which shows as its width narrowing and widening */
  flip: number
  kind: TreatKind
  /** sets its sway and when it fades apart from the others’, 0–1 */
  phase: number
  /** how long it is, in meters */
  size: number
  /** how fast it turns in the view, in radians per second */
  spin: number
  /** how fast it is flung out, in m/s */
  velocity: PortalOffset
}

/** how strongly a candy is pulled down, in m/s² */
export const gravity = 9.81
/** how much of its speed a candy keeps up when it bounces off the floor, and along it */
export const bounce = {
  up: 0.32,
  along: 0.45,
} as const
/** how fast confetti loses its speed to the air, per second, and how fast it falls at most, in m/s */
export const flutter = {
  drag: 2.2,
  fall: 0.85,
} as const
/** seconds after the result flipped out that the treats start fading, the first of them, and how long fading them all takes */
export const fading = {
  start: 2.5,
  stagger: 0.4,
  duration: 0.5,
} as const

const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (index: number, seed: number) => (index * goldenRatio + seed) % 1
const between = (index: number, seed: number, low: number, high: number) => low + sequence(index, seed) * (high - low)
const candyColors = ['#ff7b1c', '#8a3ffc', '#7ad321', '#ff4fa3', '#ffb31a']
const confettiColors = ['#ff8a1f', '#9b4dff', '#1d1024', '#6be03a', '#ffd23f']
/** how many treats of each kind burst out */
const counts: Record<TreatKind, number> = {
  wrapped: 20,
  corn: 16,
  confetti: 44,
}

/** A burst of Halloween treats flung up and out of the portal like out of a party popper: wrapped candies and candy corn tumbling, which bounce once on the floor and come to rest there, and confetti in orange, purple, black and green fluttering down more slowly, until they all fade away. */
export const flungTreats: ReadonlyArray<FlungTreat> = treatKinds.flatMap(kind => Array.from({length: counts[kind]}, (_, index): FlungTreat => {
  const seed = treatKinds.indexOf(kind) * 0.31
  const confetti = kind === 'confetti'
  return {
    kind,
    color: (confetti ? confettiColors : candyColors)[index % 5],
    delay: between(index * 3, seed + 0.17, 0, 0.12),
    velocity: [between(index * 5, seed + 0.41, -1, 1) * (confetti ? 3.2 : 1.5), between(index * 7, seed + 0.63, confetti ? 2.6 : 2.6, confetti ? 5.4 : 4.4), between(index * 11, seed + 0.07, confetti ? 0.8 : 0.4, confetti ? 3.4 : 1.6)],
    spin: between(index * 13, seed + 0.53, 6, 14) * (index % 2 ? 1 : -1),
    flip: between(index * 17, seed + 0.89, confetti ? 7 : 3, confetti ? 15 : 8),
    size: confetti ? between(index * 19, seed + 0.27, 0.06, 0.09) : between(index * 19, seed + 0.27, kind === 'corn' ? 0.1 : 0.15, kind === 'corn' ? 0.13 : 0.2),
    phase: sequence(index * 23, seed + 0.71),
  }
}))

/** how high above the floor the middle of a treat lying on it is, in meters */
export function restingHeight({kind, size}: Pick<FlungTreat, 'kind' | 'size'>) {
  return kind === 'confetti' ? 0.01 : size * 0.3
}

/**
 * When a candy lands on a floor `floor` meters below the portal’s middle (negative), in seconds after it was flung out, and how long it hops after bouncing off it before it comes to rest; confetti never bounces.
 * `CandyBurst` flings them the same way on the GPU.
 */
export function candyLanding(treat: Pick<FlungTreat, 'kind' | 'size' | 'velocity'>, floor: number) {
  const up = treat.velocity[1]
  const drop = Math.max(0, -floor - restingHeight(treat))
  const landing = (up + Math.sqrt(up * up + 2 * gravity * drop)) / gravity
  const impact = gravity * landing - up
  return {
    landing,
    hop: 2 * impact * bounce.up / gravity,
  }
}
