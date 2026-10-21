import lobbyVault from './lobbyVault.ts'
import {roseCenterY} from './LobbyVaultGeometry.ts'

/**
 * The carved frieze on the Lobby’s north lunette, in meters in the vault’s space, whose origin is the room center at floor level
 * and whose -z points north, toward the entrance and the rose window.
 *
 * The lunette above the rose window is bare travertine. A row of gilt-framed panels crosses it, each with the gallery’s
 * eight-pointed star, and the center panel carries the gallery’s name in gilt beneath its star.
 */
export const lobbyLunetteRelief = {
  /** the lunette’s room-facing face, where the carving starts */
  faceZ: -lobbyVault.halfLength,
  /** height of the panels’ center */
  y: 12.98,
  panel: {
    width: 1.2,
    height: 0.62,
    /** how far a panel stands proud of the wall */
    depth: 0.045,
  },
  /** gilt fillet framing each panel */
  fillet: {
    width: 0.05,
    depth: 0.012,
  },
  /** panels across the lunette, centered on the axis */
  count: 3,
  /** clear gap between neighboring panels */
  gap: 0.26,
  star: {
    /** radius of the points and of the valley between them */
    outer: 0.3,
    inner: 0.125,
    points: 8,
    depth: 0.03,
  },
  inscription: {
    /** height of the letters’ center below the center panel’s center */
    drop: 0.6,
    height: 0.075,
    depth: 0.01,
    /** thickness of a stroke */
    stroke: 0.015,
  },
} as const

/** The letters of the gilt inscription, as strokes of `[x0, y0, x1, y1]` in a unit box, y up. */
export const lunetteInscription = {
  text: 'SLOP GALLERY',
  /** advance of one letter, in stroke widths */
  advance: 5.4,
  /** the space between the words, in stroke widths */
  gap: 3.2,
  letters: {
    S: [[0, 0.62, 1, 1], [0, 0.62, 0, 1], [0, 0.38, 1, 0.62], [1, 0, 1, 0.38], [0, 0, 1, 0]],
    L: [[0, 0, 0, 1], [0, 0, 0.85, 0]],
    O: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 1], [0, 0, 1, 0]],
    P: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 0.45, 1, 1], [0, 0.45, 1, 0.45]],
    G: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0, 1, 0], [1, 0, 1, 0.55], [0.45, 0.45, 1, 0.45]],
    A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.22, 0.38, 0.78, 0.38]],
    E: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.45, 0.85, 0.45], [0, 0, 1, 0]],
    R: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 0.45, 1, 1], [0, 0.45, 1, 0.45], [0.35, 0.45, 1, 0]],
    Y: [[0, 1, 0.5, 0.45], [1, 1, 0.5, 0.45], [0.5, 0, 0.5, 0.45]],
  },
} as const

/** Centers of the panels along x, the middle one on the axis. */
export function lunettePanelOffsets() {
  const {count, gap, panel} = lobbyLunetteRelief
  const stride = panel.width + gap
  return Array.from({length: count}, (_, index) => (index - (count - 1) / 2) * stride)
}

/** The frieze clears the rose window below and the vault’s crown above, and every panel stays inside the lunette’s curve. */
export function lunetteReliefClearance() {
  const {inscription, panel, y} = lobbyLunetteRelief
  const top = y + panel.height / 2
  const bottom = y - inscription.drop - inscription.height / 2
  const outer = lunettePanelOffsets().at(-1)! + panel.width / 2
  const fieldHalf = Math.sqrt(Math.max(0, lobbyVault.outerRadius ** 2 - (top - lobbyVault.springY) ** 2))
  // The rose window’s gilt outer ring reaches about 0.54 m past its opening.
  const roseTop = roseCenterY + lobbyVault.rose.radius + 0.54
  return {
    aboveRose: bottom - roseTop,
    belowCrown: lobbyVault.crownY - top,
    insideLunette: fieldHalf - outer,
  }
}

export default lobbyLunetteRelief
