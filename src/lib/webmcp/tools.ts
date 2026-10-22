import type {FrameDownload, FrameFormat} from '#src/lib/downloadFrame.ts'
import type {PortraitSlot} from '#src/lib/gallery/types.ts'
import type {PlayerDumpSnapshot} from '#src/lib/telemetry/recordPlayerDump.ts'
import type {WorldAnalysis} from './analyzeWorld.ts'
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
  analyzeWorld: () => WorldAnalysis
  downloadFrame: (options: {
    format?: FrameFormat
    name?: string
  }) => Promise<FrameDownload & {dump: PlayerDumpSnapshot | null}>
  getAim: () => AimSnapshot
  getKnots: () => ReadonlyArray<KnotDump>
  getPortraitSlots: () => ReadonlyArray<PortraitSlot>
  getTelemetry: () => {
    collection: ReturnType<VictoriaClient['collectionStatus']>
    delivery: ReturnType<VictoriaClient['status']>
    sessionId: string
  } | null
}

const frameFormats: Array<FrameFormat> = ['webp', 'png']
const fileNamePattern = /^[\w\-.]{1,100}$/u

export default function createWebmcpTools(getBridge: () => WebmcpBridge): Array<WebMCP.ModelContextTool> {
  const readTools: Array<WebMCP.ModelContextTool> = [
    {
      name: 'get_aim',
      title: 'Inspect player aim',
      description: 'Read the current camera ray and visible mesh hits ordered by distance. Includes full-precision world and local positions, surface normals, instance IDs, UVs, materials and ancestor metadata. Read-only: does not move the player, change focus or simulate input. Use world-space hit points and normals for scene placement.',
      read: () => getBridge().getAim(),
    },
    {
      name: 'get_telemetry',
      title: 'Inspect telemetry delivery',
      description: 'Read the current session ID, collection limits and Victoria delivery status, or null when telemetry is disabled. Use the session ID to correlate VictoriaLogs, VictoriaMetrics, VictoriaTraces and X-key ego.dump records (X dumps only with ?development). Does not enable telemetry or send data.',
      read: () => getBridge().getTelemetry(),
    },
    {
      name: 'dump_knots',
      title: 'Dump current Knots',
      description: 'Return every Knot currently present in the level with its canonical ID, display name, world position and current session rarity. In Knottingham rarity edit mode, this includes unsaved sign edits. Other levels return an empty array.',
      read: () => getBridge().getKnots(),
    },
    {
      name: 'dump_portrait_slots',
      title: 'Dump portrait slots',
      description: 'Return every portrait slot of the level with its ID, wall ID, ratio, priority for default works, frame width and height in meters, world-space frame center, rotation and whether its placard hangs above the frame. With ?edit_portrait_slots, this includes the edits made in this browser. Levels without slots return an empty array.',
      read: () => getBridge().getPortraitSlots(),
    },
    {
      name: 'analyze_world',
      title: 'Analyze world per room',
      description: 'Sort every visible mesh of the scene into the room holding most of its world bounding box (summed over instances) and every light into the room whose fence holds it, and report, per room, its fence (one axis-aligned box of min/max corners in world meters from floor to clear height, or a list of them: the Corridor’s hall and its stair to the Sienna, the Lodge and its threshold), its meshes (scene path of named ancestors, instances unless just 1, material name or type, a list for several and left out for a plain MeshStandardNodeMaterial, spill: the other rooms holding at least 1% of its bounding volume, and triangles, most triangles first) and its lights (type, world position, color, intensity, range, decay, spot cone and whether it casts shadows). A mesh meeting no fence, like a crater floor, goes to the room above or below it. Meshes mostly outside every room, such as in passages and stairways, and lights outside every fence seen from above are listed under elsewhere; ambient, hemisphere and directional lights under globalLights. Triangle counts follow draw ranges and instance counts, not per-frame culling. Levels without rooms list everything under elsewhere.',
      read: () => getBridge().analyzeWorld(),
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
  return [
    ...readTools,
    {
      name: 'download_frame',
      title: 'Download current frame',
      description: 'Render the current camera view once more through the WebGPU capture bridge and save it as a lossless WebP or PNG browser download. DOM overlays such as menus are not in it. Returns the file name, format, width, height and encoded byte size (PNG also reports the nonblack pixel fraction), plus `dump`: the same player snapshot the X key prints (player and input state, camera matrices, full-precision aim hits, gallery context and query overrides), taken right before the frame, or null without a player. Unlike X, it is not logged, copied or confirmed with a sound. Does not move the player, change focus or simulate input.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'file name without extension, made of letters, digits, “_”, “.” and “-”. Default: <level>-<dump id>, like X dump screenshots, or <level>-<timestamp> without a player',
            pattern: fileNamePattern.source,
          },
          format: {
            type: 'string',
            description: 'image format. PNG is what the capture bridge encodes anyway; WebP is smaller. Default: webp',
            enum: frameFormats,
          },
        },
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
      },
      execute: async (input: unknown, {signal}) => {
        signal.throwIfAborted()
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'name' && key !== 'format')) {
          throw new TypeError('This tool takes an object with an optional name and format.')
        }
        const {name, format} = input as {
          format?: unknown
          name?: unknown
        }
        if (name !== undefined && (typeof name !== 'string' || !fileNamePattern.test(name))) {
          throw new TypeError(`name must match ${fileNamePattern}.`)
        }
        if (format !== undefined && !frameFormats.includes(format as FrameFormat)) {
          throw new TypeError(`format must be one of ${frameFormats.join(', ')}.`)
        }
        return getBridge().downloadFrame({
          name,
          format: format as FrameFormat | undefined,
        })
      },
    },
  ]
}
