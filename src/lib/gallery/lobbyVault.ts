import {wallFace, wallTop} from './architectureDimensions.ts'
import lobby from './lobby.ts'

const degrees = Math.PI / 180
/** Inner face of the long walls, measured from the room’s axis. The vault springs from this plane. */
const halfSpan = lobby.width / 2 - wallFace
/** Inner face of the end walls, measured from the room center. */
const halfLength = (lobby.southZ - lobby.northZ) / 2 - wallFace
const springY = 9.6
const cofferDepth = 0.2
const shell = 0.35

/**
 * The Lobby’s coffered barrel vault, in meters relative to the room center at floor level.
 *
 * Above the walls’ cornice, an attic storey of the same clad stone rises to an impost molding, where a semicircular vault
 * springs from the wall faces. Transverse ribs stand over pilasters every 4 m. Between them, the flanks are coffered with a gilt
 * rosette in every field, and a glazed band runs along the crown, showing the sky and letting the sun in. Each end wall closes
 * the vault with a lunette pierced by a stained-glass rose window.
 *
 * Angles around the vault’s axis (z) are measured from +x: 0 is the east springing, π/2 the crown, π the west springing.
 */
export const lobbyVault = {
  halfSpan,
  halfLength,
  /** the attic storey starts on top of the walls */
  atticBottom: wallTop,
  springY,
  /** radius of the coffer frames’ inner face, flush with the walls below */
  radius: halfSpan,
  crownY: springY + halfSpan,
  /** top of the cornice’s upper band that the walls below already carry */
  corniceTop: wallTop - 0.3 - 0.22 + 0.23 / 2,
  bay: 4,
  impost: {
    /** the upper, deeper band ends at the springing line */
    height: 0.3,
    projection: 0.3,
    /** a slimmer band under it */
    lowerHeight: 0.14,
    lowerProjection: 0.14,
    /** height and projection of the gilt fillet along the upper band’s face */
    bead: 0.05,
    fillet: 0.012,
  },
  pilaster: {
    width: 0.56,
    projection: 0.12,
    base: {
      height: 0.16,
      width: 0.68,
      projection: 0.18,
    },
    capital: {
      height: 0.22,
      width: 0.74,
      projection: 0.22,
    },
  },
  /** sunk panels framed by a slim molding between the pilasters of the attic */
  atticPanel: {
    inset: 0.42,
    bottom: wallTop + 0.35,
    top: springY - 0.85,
    molding: 0.08,
    projection: 0.05,
  },
  rib: {
    width: 0.56,
    /** how far a rib hangs below the coffer frames */
    depth: 0.3,
    /** gilt fillets run along both edges of a rib’s soffit: their width, how far they stand proud and their inset from the edge */
    bead: 0.05,
    fillet: 0.012,
    beadInset: 0.08,
  },
  coffer: {
    depth: cofferDepth,
    /** coffer rows on each flank, from the springing to the glazed band */
    rows: 4,
    /** coffers along z between two ribs */
    columns: 2,
    /** width of the frames between coffers */
    frame: 0.2,
    /** the frames along the glazed band are heavier: they carry the glazing */
    curb: 0.34,
    rosette: 0.2,
  },
  /** shell thickness behind the coffers and the glass */
  shell,
  /** outer radius of the vault, which the attic walls and lunettes reach */
  outerRadius: halfSpan + cofferDepth + shell,
  glazing: {
    /** the band spans this angle on either side of the crown */
    halfAngle: 32 * degrees,
    /** panes across the band and along each bay */
    across: 8,
    along: 3,
    bar: {
      width: 0.045,
      depth: 0.08,
    },
  },
  rose: {
    /** height of the center above the springing line */
    rise: 3.4,
    radius: 2.5,
    /** stone ring lining the opening, between the glass and the wall */
    ring: 0.14,
    hub: 0.42,
    spokes: 12,
    tracery: {
      width: 0.1,
      depth: 0.16,
    },
    /** small rings between the spokes */
    foil: 0.36,
    lunetteThickness: 0.4,
  },
} as const

export type VaultRib = {
  /** wall arches stand against the end walls and frame the lunettes */
  wallArch: boolean
  /** center along the room’s axis */
  z: number
}

/** Every transverse rib, north to south: the wall arches at both ends and one over each pilaster. */
export function vaultRibs(): Array<VaultRib> {
  const {bay, rib} = lobbyVault
  // Centered on the room, on the 4 m grid of its floor tiles and the old ceiling’s beams.
  const count = Math.floor((halfLength - rib.width) / bay)
  const inner = Array.from({length: count * 2 + 1}, (_, i) => (i - count) * bay)
  return [
    {
      z: -halfLength + rib.width / 2,
      wallArch: true,
    },
    ...inner.map(z => ({
      z,
      wallArch: false,
    })),
    {
      z: halfLength - rib.width / 2,
      wallArch: true,
    },
  ]
}

/** The clear stretches between neighboring ribs, as [north, south] z, where the coffers and the glazing sit. */
export function vaultBays(): Array<readonly [number, number]> {
  const ribs = vaultRibs()
  const half = lobbyVault.rib.width / 2
  return ribs.slice(1).map((rib, i) => [ribs[i].z + half, rib.z - half] as const)
}

/** Angle where the glazed band meets the east flank; the west one mirrors it at π minus this. */
export const glazingStart = Math.PI / 2 - lobbyVault.glazing.halfAngle

/** Angles of the frames between coffer rows on the east flank, from the springing up to the curb of the glazed band. */
export function cofferFrameAngles() {
  const {rows} = lobbyVault.coffer
  return Array.from({length: rows + 1}, (_, i) => glazingStart * i / rows)
}

/** Height of a point on the vault’s inner face, or the springing height beyond it. */
export function vaultHeight(x: number) {
  const {radius} = lobbyVault
  return springY + Math.sqrt(Math.max(0, radius * radius - x * x))
}

/**
 * The great chandeliers hang on long rods from the crown of every other rib, 8 m apart and as far from the end walls.
 * Each one’s light stands in for all of its candles.
 */
export const lobbyChandeliers = {
  /** z of the ribs they hang from, relative to the room center */
  offsets: [-12, -4, 4, 12],
  /** the one nearest the fountain, 2 m north of it */
  shadowCaster: 4,
  /** height of the top of each chandelier’s column above the floor */
  y: 10.4,
  /** where the rods meet the ribs: the soffit at the crown */
  anchorY: lobbyVault.crownY - lobbyVault.rib.depth,
  color: '#ffd9a0',
  intensity: 55,
  /** like the old lamps’, short enough that hardly any light reaches the neighboring rooms through their doorways */
  distance: 16,
} as const

export default lobbyVault
