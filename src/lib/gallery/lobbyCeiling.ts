import type {FloorRectangle} from './floors.ts'

import lobby from './lobby.ts'

/**
 * The Lobby’s barrel-vaulted ceiling, in meters relative to the room center.
 *
 * The vault springs from a stone cornice at the old ceiling line and rises to a rounded crown well above it. Its plaster shell is
 * open in three glazed bays: clear panes in bronze bars, so the sky above the gallery shows through. Between the bays, and at
 * either end, solid plaster ribs carry the vault and the chandeliers hang from the ribs’ soffits.
 */
export const lobbyCeiling = {
  /** the old flat ceiling line the vault springs from, just under the cornice top */
  spring: 5.5,
  /** underside of the vault at its crown: a semicircle, so the rise equals half the room's width */
  crown: 13.5,
  /** plaster thickness of the shell, measured radially */
  shell: 0.22,
  /** how many bands the semicircle is split into; even, so a band straddles the crown */
  bands: 16,
  /** ribs across the vault, including the two that sit on the end walls */
  ribs: 5,
  rib: {
    /** how far a rib projects below the shell, along the radius */
    depth: 0.38,
    /** width of a rib along the vault */
    width: 0.55,
  },
  /** bronze molding along the springing, proud of the shell */
  molding: {
    depth: 0.08,
    height: 0.16,
  },
  /** how many panes each glazed bay holds along the vault and along the room */
  panes: [4, 4] as const,
  /** glazing bars run under the glass and frame its edges; wide enough to read from the floor */
  bar: {
    width: 0.34,
    depth: 0.16,
    rim: 0.4,
  },
  /** the glass sits just outside the shell, behind the bars */
  glassInset: -0.2,
} as const

const halfWidth = lobby.width / 2
const halfDepth = (lobby.southZ - lobby.northZ) / 2
/** Rise of the intrados from the springing to the crown. */
export const lobbyVaultRise = lobbyCeiling.crown - lobbyCeiling.spring
/** Radius of the intrados: a semicircle spanning the room. */
export const lobbyVaultRadius = halfWidth
/** Center of the vault’s circle, below the springing by the difference between radius and rise. */
export const lobbyVaultCenterY = lobbyCeiling.spring - (lobbyVaultRadius - lobbyVaultRise)

if (Math.abs(lobbyVaultRadius - lobbyVaultRise) > 1e-9) {
  throw new Error('The Lobby vault is drawn as a semicircle, so its rise has to equal half the room’s width.')
}

/** Half-angle of one plaster band, measured from the crown. */
const bandAngle = Math.PI / lobbyCeiling.bands

export type VaultBand = {
  /** angle of the band’s center from straight up, positive toward +x */
  angle: number
  /** whether this band is glazed; the crown band and the two bands above the springing are solid */
  glazed: boolean
  /** index from the west springing */
  index: number
}
export type VaultRib = {
  /** position along the vault, relative to the room center */
  z: number
}
export type VaultBay = FloorRectangle & {
  /** the clear glazed field inside the ribs and the solid edge bands */
  field: FloorRectangle
}

const ribZs = Array.from({length: lobbyCeiling.ribs}, (_, index) => -halfDepth + index * (halfDepth * 2) / (lobbyCeiling.ribs - 1))

/** Every plaster band of the vault, from the west springing to the east. */
export function lobbyVaultBands(): Array<VaultBand> {
  return Array.from({length: lobbyCeiling.bands}, (_, index) => ({
    index,
    angle: -Math.PI / 2 + bandAngle * (index + 0.5),
    // The crown lets the sun through. The lower half of each side stays solid plaster, so the vault reads as a frame rather than a hole.
    glazed: index > 3 && index < lobbyCeiling.bands - 4,
  }))
}

/** The ribs across the vault, the ones on the end walls included. */
export function lobbyVaultRibs(): Array<VaultRib> {
  return ribZs.map(z => ({z}))
}

const bay = (z1: number, z2: number): VaultBay => {
  const glazed = lobbyVaultBands().filter(entry => entry.glazed)
  const west = glazed[0].angle - bandAngle / 2
  const east = glazed.at(-1)!.angle + bandAngle / 2
  const inset = lobbyCeiling.rib.width / 2
  const x1 = Math.sin(west) * lobbyVaultRadius
  const x2 = Math.sin(east) * lobbyVaultRadius
  const center = [(x1 + x2) / 2, (z1 + z2) / 2] as const
  return {
    center,
    size: [x2 - x1, z2 - z1],
    field: {
      center,
      size: [x2 - x1, z2 - z1 - inset * 2],
    },
  }
}

/** The three glazed bays between the ribs, north to south. */
export function lobbyVaultBays(): Array<VaultBay> {
  const bays: Array<VaultBay> = []
  for (let index = 0; index < ribZs.length - 1; index++) {
    bays.push(bay(ribZs[index], ribZs[index + 1]))
  }
  return bays
}

/** Size of one pane of a glazed bay, in meters, along the vault and along the room. */
export function vaultPaneSize(field: readonly [number, number]): [number, number] {
  const [across, along] = lobbyCeiling.panes
  if (across < 2 || along < 2) {
    throw new RangeError('A glazed bay needs at least two panes each way.')
  }
  return [field[0] / across, field[1] / along]
}

/** Positions of the glazing bars inside one bay, measured from the bay’s center, for `panes` panes over `length` meters. */
export function vaultBarOffsets(length: number, panes: number) {
  if (!(panes >= 2) || !Number.isInteger(panes)) {
    throw new RangeError('Glazing bars need a whole number of panes, at least two.')
  }
  const pane = length / panes
  return Array.from({length: panes - 1}, (_, index) => -length / 2 + (index + 1) * pane)
}

/**
 * A point on the intrados. `angle` is measured from straight up, so the west springing is −π/2 and the crown is 0.
 * `inset` moves the point inward along the radius, toward the room.
 */
export function vaultPoint(angle: number, z: number, inset = 0): [number, number, number] {
  const radius = lobbyVaultRadius - inset
  return [Math.sin(angle) * radius, lobbyVaultCenterY + Math.cos(angle) * radius, z]
}

/** The chandeliers, hung from the ribs between the glazed bays. */
export const lobbyChandeliers = {
  /** drop from the rib soffit at the crown to the hub */
  drop: 3.4,
  /** z of each chandelier, on the ribs that stand between bays */
  zs: ribZs.slice(1, -1),
  color: '#ffd9a0',
  /** candela of one candle’s flame, before the fixture gathers them */
  candleIntensity: 14,
  distance: 22,
  /** index of the chandelier under the room’s middle, which throws the shadows */
  get shadowIndex() {
    return Math.floor(this.zs.length / 2)
  },
} as const

/** World height of a chandelier’s hub. */
export function lobbyChandelierHeight() {
  const [, soffitY] = vaultPoint(0, 0, lobbyCeiling.rib.depth)
  return soffitY - lobbyChandeliers.drop
}

export default lobbyCeiling
