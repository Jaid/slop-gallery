import lobby from './lobby.ts'

/** The cathedral roof is independent of the original walls: doorways, artwork coordinates and the lower cornice do not move. All roof geometry is room-local. */
export const lobbyCeiling = {
  radius: lobby.width / 2,
  spring: 8,
  crown: 8 + lobby.width / 2,
  wallTop: 5.8,
  thickness: 0.22,
  halfDepth: (lobby.southZ - lobby.northZ) / 2,
  bays: 6,
  ribWidth: 0.38,
  /** half-angle of the continuous glazed crown, measured from the zenith */
  skylightAngle: 0.34,
  rose: {
    y: 10.6,
    radius: 2.35,
  },
  clerestory: {
    bottom: 6.05,
    top: 7.65,
    width: 3.1,
  },
} as const

export const lobbyBayLength = lobbyCeiling.halfDepth * 2 / lobbyCeiling.bays
export const lobbyRibs = Array.from({length: lobbyCeiling.bays + 1}, (_, i) => -lobbyCeiling.halfDepth + i * lobbyBayLength)
export const lobbyBays = lobbyRibs.slice(1).map((end, i) => ({
  start: lobbyRibs[i],
  end,
  center: (lobbyRibs[i] + end) / 2,
}))
export const lobbyChandeliers = {
  offsets: [-lobbyCeiling.halfDepth * 2 / 3, 0, lobbyCeiling.halfDepth * 2 / 3],
  y: 7.1,
  radius: 1.85,
  intensity: 155,
  distance: 25,
  color: '#ffe0a3',
} as const

/** Inside face of the round roof, in world meters above the Lobby floor. */
export function lobbyVaultHeight(x: number) {
  return lobbyCeiling.spring + Math.sqrt(Math.max(0, lobbyCeiling.radius ** 2 - x ** 2))
}

export default lobbyCeiling
