import lobbyVault from './lobbyVault.ts'

const {rib, radius, rose} = lobbyVault

/**
 * The great clock of the Lobby’s south lunette, in meters in its own frame: the origin at the dial’s center on the lunette’s face,
 * +y up and +z out into the room. It answers the north end’s rose window at the same height and size.
 *
 * Gilt Roman numerals stand on a band of lapis enamel around an ivory center engraved with a sunray guilloché, behind blued
 * steel Breguet hands. Gilt rays of a baroque gloire fan out across the lunette from its stone frame, longest where the lunette
 * is widest.
 */
export const lobbyClock = {
  /** height of the dial’s center above the springing, the rose window’s */
  rise: rose.rise,
  radius: rose.radius,
  /** the lapis band starts here; inside it is ivory */
  chapter: 1.47,
  numerals: {
    /** distance of the numerals’ feet from the center; their heads point outward */
    base: 1.6,
    height: 0.46,
    /** thick and thin strokes, the gap between letters and the bars above and below each numeral */
    thick: 0.07,
    thin: 0.032,
    gap: 0.045,
    letter: 0.28,
    bar: 0.034,
    /** how far the bars reach past the outermost strokes */
    overhang: 0.03,
    relief: 0.022,
  },
  /** the minute track: two rings with a tick for every minute between them */
  track: [2.17, 2.37] as const,
  hands: {
    hour: 1.32,
    minute: 2.12,
  },
  /** gilt pearls strung around the frame’s outer archivolt: how many and their radius */
  pearls: {
    count: 72,
    radius: 0.045,
  },
  gloire: {
    count: 40,
    /** where the rays emerge from behind the clock’s frame */
    start: 2.98,
    /** semi-axes of the oval the straight rays’ tips trace, wider than high to fill the lunette without stretching the side rays */
    oval: [4.75, 3.85] as const,
    /** the ends of the rays keep this clearance from the wall arch above and the cornice below */
    archClearance: 0.4,
    cornerClearance: 0.3,
    /** every other ray is a wavy flame, a little shorter than the straight rays between them */
    flameShare: 0.8,
    /** rays shorter than this are left out rather than drawn as stubs */
    minimum: 0.45,
    /** height of the ridge along a ray at its root */
    relief: 0.06,
  },
} as const

/** Height of the dial’s center above the floor. */
export const lobbyClockCenterY = lobbyVault.springY + lobbyClock.rise

export type GloireRay = {
  /** direction of the ray, measured from +x toward +y */
  angle: number
  flame: boolean
  length: number
}

/** How far from the dial’s center a ray in the direction `angle` may reach before it meets the wall arch or the cornice. */
export function gloireReach(angle: number) {
  const {archClearance, cornerClearance} = lobbyClock.gloire
  const rise = lobbyClock.rise
  // The lunette is bounded by the soffit of the wall arch, a circle around the middle of the springing line.
  const arch = radius - rib.depth - archClearance
  const sin = Math.sin(angle)
  const toArch = -rise * sin + Math.sqrt(rise * rise * sin * sin - rise * rise + arch * arch)
  const toCornice = sin < 0 ? (rise - cornerClearance) / -sin : Infinity
  return Math.min(toArch, toCornice)
}

/**
 * The gloire’s rays, one every 9° around the clock, alternately straight and flaming, with straight ones at the quarters. The straight rays’ tips trace an oval, cut
 * short where the arch or the cornice comes closer; downward rays that would be stubs are left out.
 */
export function gloireRays(): Array<GloireRay> {
  const {count, flameShare, minimum, oval: [wide, high], start} = lobbyClock.gloire
  const rays: Array<GloireRay> = []
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count
    const flame = i % 2 === 1
    const ovalRadius = wide * high / Math.hypot(high * Math.cos(angle), wide * Math.sin(angle))
    const length = (Math.min(ovalRadius, gloireReach(angle)) - start) * (flame ? flameShare : 1)
    if (length >= minimum) {
      rays.push({
        angle,
        flame,
        length,
      })
    }
  }
  return rays
}

/**
 * Clockwise angles of the hands from twelve o’clock, in radians, for a local time. Like a station clock’s, the hands jump once a
 * minute: the sun’s shadow map is kept until a caster moves, and a sweeping hand would have it rendered again every half second.
 */
export function clockHandAngles(date: Date) {
  const minutes = date.getHours() % 12 * 60 + date.getMinutes()
  return {
    hour: minutes / 720 * Math.PI * 2,
    minute: minutes % 60 / 60 * Math.PI * 2,
  }
}

/** Numerals of the dial, from one to twelve, with the clockmakers’ IIII for four. */
export const clockNumerals = ['I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const

export default lobbyClock
