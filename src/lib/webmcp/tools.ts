import type {AimSnapshot} from 'ego-player'
import type {Rarity} from 'knot-materials/rarities.ts'
import type VictoriaClient from 'victoria-browser-client'

export type KnotDump = {
  id: string
  name: string
  position: [number, number, number]
  rarity: Rarity
}

export type WebmcpBridge = {
  getAim: () => AimSnapshot
  getKnots: () => ReadonlyArray<KnotDump>
  getTelemetry: () => {
    collection: ReturnType<VictoriaClient['collectionStatus']>
    delivery: ReturnType<VictoriaClient['status']>
    sessionId: string
  } | null
}

export default function createWebmcpTools(getBridge: () => WebmcpBridge): Array<WebMCP.ModelContextTool> {
  return [
    {
      name: 'get_aim',
      title: 'Inspect player aim',
      description: 'Read the current camera ray and visible mesh hits ordered by distance. Includes full-precision world and local positions, surface normals, instance IDs, UVs, materials and ancestor metadata. Read-only: does not move the player, change focus or simulate input. Use world-space hit points and normals for scene placement.',
      read: () => getBridge().getAim(),
    },
    {
      name: 'get_telemetry',
      title: 'Inspect telemetry delivery',
      description: 'Read the current session ID, collection limits and Victoria delivery status, or null when telemetry is disabled. Use the session ID to correlate VictoriaLogs, VictoriaMetrics, VictoriaTraces and X-key ego.dump records. Does not enable telemetry or send data.',
      read: () => getBridge().getTelemetry(),
    },
    {
      name: 'dump_knots',
      title: 'Dump current Knots',
      description: 'Return every Knot currently present in the level with its canonical ID, display name, world position and current session rarity. In Knottingham rarity edit mode, this includes unsaved sign edits. Other levels return an empty array.',
      read: () => getBridge().getKnots(),
    },
  ].map(({read, ...tool}) => ({
    ...tool,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute: (input: unknown, {signal}) => {
      signal.throwIfAborted()
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
        throw new TypeError('This tool takes an empty input object.')
      }
      return read()
    },
  }))
}
