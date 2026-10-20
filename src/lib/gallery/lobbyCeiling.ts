import type {LanternRoof} from '../materials/lights/LanternLight.ts'
import type {FloorRectangle} from './floors.ts'

import {skySunDirection} from '../materials/SkyBoxMaterial.ts'
import lobby from './lobby.ts'

/**
 * The Lobby’s barrel-vaulted cathedral ceiling, in meters relative to the room center.
 *
 * A semicircular vault of 8 m radius springs from the top of the 5.5 m walls and rises to a 13.5 m crown. Molded transverse
 * arch ribs divide the 40 m hall into ten 4 m bays, crossed by longitudinal ribs at ±32° and ±60° and a central spine rib
 * along the crown.
 *
 * The upper vault (within ±60° of the crown) is glazed with curved conservatory panes in bronze glazing bars, looking out
 * into a procedural light-blue sky dome with cumulus clouds and a bright sun. The lower haunches (60° to 90°) are carved into
 * curved recessed coffers with gilt inner frames and radial petal medallions, framed above the north and south end walls by
 * matching semicircular tympanums with ornate wheel-rose windows.
 *
 * Three grand two-tier brass chandeliers hang along the nave axis from the spine bosses and light the hall together with the
 * sunlight streaming down through the glass.
 */
export const lobbyCeiling = {
  /** spring height where the semicircular vault meets the top of the walls */
  springY: 5.5,
  /** inner radius of the barrel vault, matching the half-width of the 16 m room */
  radius: lobby.width / 2,
  /** inner crown height of the vault (springY + radius = 13.5 m) */
  crownY: 5.5 + lobby.width / 2,
  /** thickness of the outer masonry vault shell */
  shellThickness: 0.34,
  /** bay length along the z axis (10 bays across the 40 m room) */
  bay: 4,
  /** angle from the crown (0 rad) to the outer edge of the glazed skylight band (60° = π/3) */
  glazedAngle: Math.PI / 3,
  /** longitudinal ribs dividing the glazed crown and side coffers, in radians from the crown */
  longitudinalAngles: [
    0,
    Math.PI * 32 / 180,
    Math.PI / 3,
  ] as const,
  /** transverse and longitudinal stone rib profile */
  rib: {
    width: 0.42,
    depth: 0.26,
    lipWidth: 0.5,
    lipDepth: 0.055,
  },
  /** stepped coffer frame on the solid lower haunches (between 60° and 90°) */
  cofferStep: {
    width: 0.28,
    depth: 0.075,
  },
  /** recessed glass offset outside the vault intrados so ribs and frames stand proud inside */
  glassOffset: 0.04,
  /** approximate pane size in meters for the bronze muntin grid and glass shader */
  pane: 1,
  /** bronze glazing bars and perimeter rim inside each skylight bay */
  bar: {
    width: 0.032,
    depth: 0.045,
    rim: 0.065,
  },
  /** procedural sky dome enclosing the upper vault */
  skyDome: {
    radius: 29,
    sunDirection: skySunDirection,
  },
} as const

/** Lowest point of the vault’s springing ribs; stays above the wall cornice’s top at 5.395 m and the entrance keystone at 5.16 m. */
export const lobbyBeamBottom = lobbyCeiling.springY - lobbyCeiling.rib.lipDepth

export type VaultCoffer = {
  /** angular span [fromAngle, toAngle] in radians measured from the crown (+x is positive, −x is negative) */
  angles: readonly [number, number]
  /** clear inner angular span inside the rib and coffer step */
  clearAngles: readonly [number, number]
  /** clear inner z span [z1, z2] relative to the room center */
  clearZ: readonly [number, number]
  /** whether this vault compartment is glazed open to the sky or a solid plaster coffer */
  laylight: boolean
  /** bay z span [z1, z2] relative to the room center */
  z: readonly [number, number]
}

const halfWidth = lobby.width / 2
const halfDepth = (lobby.southZ - lobby.northZ) / 2
const roomCenterZ = (lobby.northZ + lobby.southZ) / 2

/** The glazed floor opening, relative to the room center. */
export const lobbyOpening: FloorRectangle = {
  center: [lobby.opening.center[0], lobby.opening.center[1] - roomCenterZ],
  size: lobby.opening.size,
}

/** Z coordinates of the 11 transverse arch ribs from north (−20) to south (+20). */
export const transverseRibZs = Array.from(
  {length: Math.round(halfDepth * 2 / lobbyCeiling.bay) + 1},
  (_, i) => -halfDepth + i * lobbyCeiling.bay,
)

/**
 * Height of the vault intrados (inner stone curve) at horizontal offset `x` from the room center.
 */
export function vaultHeightAt(x: number) {
  const clamped = Math.min(halfWidth, Math.abs(x))
  return lobbyCeiling.springY + Math.sqrt(Math.max(0, halfWidth ** 2 - clamped ** 2))
}

/**
 * Every compartment of the vaulted ceiling, ordered north to south and west to east.
 * Each 4 m bay has six compartments across the arch:
 * - west haunch coffer (−90° to −60°): solid carved coffer with gilt rosette
 * - west outer skylight (−60° to −32°): glazed
 * - west crown skylight (−32° to 0°): glazed
 * - east crown skylight (0° to +32°): glazed
 * - east outer skylight (+32° to +60°): glazed
 * - east haunch coffer (+60° to +90°): solid carved coffer with gilt rosette
 */
export function lobbyVaultCoffers(): Array<VaultCoffer> {
  const [, midAngle, glazedAngle] = lobbyCeiling.longitudinalAngles
  const bands: ReadonlyArray<readonly [number, number, boolean]> = [
    [-Math.PI / 2, -glazedAngle, false],
    [-glazedAngle, -midAngle, true],
    [-midAngle, 0, true],
    [0, midAngle, true],
    [midAngle, glazedAngle, true],
    [glazedAngle, Math.PI / 2, false],
  ]
  const angularInset = (lobbyCeiling.rib.width / 2 + lobbyCeiling.cofferStep.width) / lobbyCeiling.radius
  const zInset = lobbyCeiling.rib.width / 2 + lobbyCeiling.cofferStep.width
  const coffers: Array<VaultCoffer> = []
  for (let i = 0; i < transverseRibZs.length - 1; i++) {
    const z1 = transverseRibZs[i]
    const z2 = transverseRibZs[i + 1]
    for (const [a1, a2, laylight] of bands) {
      coffers.push({
        angles: [a1, a2],
        clearAngles: [a1 + angularInset, a2 - angularInset],
        z: [z1, z2],
        clearZ: [z1 + zInset, z2 - zInset],
        laylight,
      })
    }
  }
  return coffers
}

/**
 * Horizontal projection of the glazed skylight fields, used for coffer spill and daylight alignment checks.
 */
export function lobbySkylightFields(): Array<FloorRectangle> {
  return lobbyVaultCoffers()
    .filter(c => c.laylight)
    .map(c => {
      const x1 = lobbyCeiling.radius * Math.sin(c.clearAngles[0])
      const x2 = lobbyCeiling.radius * Math.sin(c.clearAngles[1])
      const [z1, z2] = c.clearZ
      return {
        center: [(x1 + x2) / 2, (z1 + z2) / 2] as const,
        size: [Math.abs(x2 - x1), z2 - z1] as const,
      }
    })
}

/**
 * Three grand cathedral chandeliers suspended along the Lobby’s nave, plus high daylight fill from the glazed vault.
 *
 * The chandeliers hang at z = −14 (north nave), z = −2 (above the north approach to the fountain) and z = +10 (south nave),
 * leaving the 8×8 m glass floor at z = −8 open so visitors looking up from the Oculus see the high vaulted glass and sky.
 * Each chandelier carries a roofed LanternLight so its warm candle glow lights the travertine walls and floor without
 * washing out the plaster spine directly above it.
 */
export const lobbyChandeliers = {
  /** z offsets from the room center (world z = −26, −14, −2) */
  offsets: [-14, -2, 10] as const,
  /** height of the chandelier’s central hub above the Lobby floor */
  hubY: 7.45,
  /** height where the suspension chain meets the vault crown boss */
  anchorY: lobbyCeiling.crownY - lobbyCeiling.rib.depth - lobbyCeiling.rib.lipDepth,
  /** radius of the lower candle tier */
  outerRadius: 1.78,
  /** radius of the upper candle tier */
  innerRadius: 1.14,
  /** warm candle-gold LanternLight inside each chandelier, shaded upward by the fixture’s rings and canopy */
  light: {
    /** light position relative to the hub, below the lower ring so the metalwork never shadows its own light */
    offsetY: -0.68,
    color: '#ffd894',
    intensity: 44,
    distance: 18,
    roof: {
      start: 0.12,
      end: 0.48,
      leak: 0.14,
    },
  },
} as const satisfies Record<string, unknown> & {light: Record<string, unknown> & {roof: LanternRoof}}

/**
 * High daylight sources under the glazed vault crown that complement the scene’s directional sun and the three chandeliers.
 * Roofed so they pour crisp sky-tinted sunlight down onto the travertine walls, fountain and floor opening without burning
 * out the vault ribs right beside them.
 */
export const lobbyDaylights = {
  y: 9.8,
  offsets: [-8, 4] as const,
  shadowCaster: -8,
  color: '#fff7ea',
  intensity: 42,
  distance: 22,
  shadowDistance: 26,
  roof: {
    start: 0.06,
    end: 0.34,
    leak: 0.12,
  },
} as const satisfies Record<string, unknown> & {roof: LanternRoof}

export default lobbyCeiling
