import type {Telemetry} from './Telemetry.ts'
import type {Attributes} from './types.ts'
import type {Object3D} from 'three'

export type RendererInfo = {
  autoReset: boolean
  memory: {geometries: number
    textures: number
    total?: number}
  programs?: Array<unknown> | null
  render: {calls: number
    drawCalls?: number
    lines: number
    points: number
    triangles: number}
  reset: () => void
}
export type ThreeStatisticsOptions = {attributes?: Attributes
  intervalMs?: number
  maxSamples?: number}

const owners = new WeakSet<RendererInfo>

/** Owns per-frame renderer statistics while connected, including all reflection/postprocessing passes. */
export class ThreeStatistics {
  private autoReset = true
  private connected = false
  private count = 0
  private cursor = 0
  private elapsed = 0
  private readonly intervalMs: number
  private readonly samples: Float64Array
  private skipFrame = true

  constructor(private readonly telemetry: Telemetry, private readonly info: RendererInfo, private readonly scene: Object3D, private readonly options: ThreeStatisticsOptions = {}) {
    const size = options.maxSamples ?? 16_384
    this.intervalMs = options.intervalMs ?? 5000
    if (!Number.isSafeInteger(size) || size < 1 || !Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('Statistics require a positive interval and sample capacity.')
    }
    this.samples = new Float64Array(size)
  }

  beginFrame() {
    if (this.connected) {
      this.info.reset()
    }
  }

  connect() {
    if (this.connected || owners.has(this.info)) {
      throw new Error('Mount only one ThreeStatistics collector per renderer.')
    }
    owners.add(this.info)
    this.connected = true
    this.autoReset = this.info.autoReset
    this.info.autoReset = false
    return () => {
      if (!this.connected) {
        return
      }
      this.connected = false
      owners.delete(this.info)
      this.info.autoReset = this.autoReset
      this.reset()
    }
  }

  /** delta is the actual interval between rendered frames in seconds, not a simulation timestep. */
  endFrame(delta: number) {
    if (!this.connected) {
      return
    }
    if (this.skipFrame) {
      this.skipFrame = false
      return
    }
    if (!Number.isFinite(delta) || delta <= 0) {
      return
    }
    const ms = delta * 1000
    this.samples[this.cursor] = ms
    this.cursor = (this.cursor + 1) % this.samples.length
    this.count = Math.min(this.count + 1, this.samples.length)
    this.elapsed += ms
    if (this.elapsed < this.intervalMs) {
      return
    }
    const sorted = [...this.samples.subarray(0, this.count)].toSorted((a, b) => a - b)
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
    const metric = (name: string, value: number, unit = '1') => this.telemetry.metric(`three.${name}`, value, {
      unit,
      attributes: this.options.attributes,
    })
    metric('fps', 1000 / mean, '{frame}/s')
    metric('frame.duration.mean', mean, 'ms')
    metric('frame.duration.p95', sorted[Math.ceil(sorted.length * 0.95) - 1]!, 'ms')
    metric('frame.duration.p99', sorted[Math.ceil(sorted.length * 0.99) - 1]!, 'ms')
    metric('frame.duration.max', sorted.at(-1)!, 'ms')
    metric('frame.samples', sorted.length, '{frame}')
    const {render, memory} = this.info
    metric('render.draw_calls', render.drawCalls ?? render.calls)
    metric('render.triangles', render.triangles)
    metric('render.points', render.points)
    metric('render.lines', render.lines)
    metric('memory.geometries', memory.geometries)
    metric('memory.textures', memory.textures)
    if (memory.total !== undefined) {
      metric('memory.bytes', memory.total, 'By')
    }
    if (this.info.programs) {
      metric('memory.programs', this.info.programs.length)
    }
    let objects = 0
    let meshes = 0
    let instances = 0
    let visibleMeshes = 0
    this.scene.traverse(object => {
      objects++
      if ('isMesh' in object && object.isMesh) {
        meshes++
      }
      if ('isInstancedMesh' in object && object.isInstancedMesh && 'count' in object && typeof object.count === 'number') {
        instances += object.count
      }
    })
    this.scene.traverseVisible(object => {
      if ('isMesh' in object && object.isMesh) {
        visibleMeshes++
      }
    })
    metric('scene.objects', objects)
    metric('scene.meshes', meshes)
    metric('scene.visible_meshes', visibleMeshes)
    metric('scene.instances', instances)
    this.count = 0
    this.cursor = 0
    this.elapsed = 0
  }

  reset() {
    this.count = 0
    this.cursor = 0
    this.elapsed = 0
    this.skipFrame = true
  }
}
