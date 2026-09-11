import type {AimSnapshot} from 'ego-player'
import type Telemetry from 'telemethree'

export type WebmcpBridge = {
  getAim: () => AimSnapshot
  getTelemetry: () => {sessionId: string
    signals: ReturnType<Telemetry['status']>} | null
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
      description: 'Read the current session ID and telemetry queue/export status, or null when telemetry is disabled. Use the session ID to correlate VictoriaLogs, VictoriaMetrics, VictoriaTraces and X-key ego.dump records. Does not enable telemetry or send data.',
      read: () => getBridge().getTelemetry(),
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
