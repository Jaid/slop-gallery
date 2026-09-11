import type Telemetry from './Telemetry.ts'
import type {ThreeDiagnosticsOptions} from './ThreeDiagnostics.ts'
import type {Attributes, TraceContext} from './types.ts'
import type {Scene, WebGPURenderer} from 'three/webgpu'

import {InstancedMesh, Mesh, Vector2} from 'three/webgpu'

import Distribution from './Distribution.ts'
import ThreeDiagnostics from './ThreeDiagnostics.ts'

export type ThreeStatisticsOptions = ThreeDiagnosticsOptions & {
  attributes?: Attributes
  /** Read at frame start. Return only bounded categorical metric attributes. */
  getAttributes?: () => Attributes
  /** Additional hitch-only state, never metric labels. */
  getHitchAttributes?: () => Attributes
  getTraceContext?: () => TraceContext | undefined
  intervalMs?: number
  maxSamples?: number
}
const owners = new WeakSet<WebGPURenderer>
const thresholds = [16.67, 33.33, 50, 100, 250, 1000]
const workNames = ['render.passes', 'render.draw_calls', 'render.triangles', 'render.points', 'render.lines', 'compute.calls'] as const
const memoryNames = {
  geometries: 'geometries',
  textures: 'textures',
  programs: 'programs',
  renderTargets: 'render_targets',
  attributes: 'attributes',
  indexAttributes: 'index_attributes',
  storageAttributes: 'storage_attributes',
  indirectStorageAttributes: 'indirect_storage_attributes',
  uniformBuffers: 'uniform_buffers',
  readbackBuffers: 'readback_buffers',
} as const
type Output = {dpr: number
  height: number
  samples: number
  width: number}
const equalAttributes = (a: Attributes, b: Attributes) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => b[key] === value)

/** Owns per-frame statistics across every reflection, shadow and postprocessing render. */
export default class ThreeStatistics {
  private attributes: Attributes = {}
  private autoReset = true
  private connected = false
  private readonly diagnostics: ThreeDiagnostics
  private readonly duration: Distribution
  private readonly intervalMs: number
  private output: Output = {
    dpr: 0,
    width: 0,
    height: 0,
    samples: 0,
  }
  private parent?: TraceContext
  private previousMemory: Record<string, number> = {}
  private readonly size = new Vector2
  private skipFrame = true
  private readonly slow = new Float64Array(thresholds.length)
  private readonly work: Array<Distribution>

  constructor(private readonly telemetry: Telemetry, private readonly renderer: WebGPURenderer, private readonly scene: Scene, private readonly options: ThreeStatisticsOptions = {}) {
    const size = options.maxSamples ?? 16_384
    this.intervalMs = options.intervalMs ?? 5000
    if (!Number.isSafeInteger(size) || size < 1 || !Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('Statistics require a positive interval and sample capacity.')
    }
    this.duration = new Distribution(size)
    this.work = workNames.map(() => new Distribution(size))
    this.diagnostics = new ThreeDiagnostics(telemetry, renderer, options)
  }

  beginFrame() {
    if (!this.connected) {
      return
    }
    const attributes = {
      ...this.options.attributes,
      ...this.options.getAttributes?.(),
    }
    const output = this.readOutput()
    if (!equalAttributes(attributes, this.attributes) || !equalAttributes(output, this.output)) {
      this.report()
      this.attributes = attributes
      this.output = output
    }
    this.parent = this.options.getTraceContext?.()
    this.renderer.info.reset()
    this.diagnostics.beginFrame()
  }

  connect() {
    const {backend, info} = this.renderer
    if (!('isWebGPUBackend' in backend) || backend.isWebGPUBackend !== true) {
      throw new Error('ThreeStatistics requires a native WebGPU renderer.')
    }
    if (this.connected || owners.has(this.renderer)) {
      throw new Error('Mount only one ThreeStatistics collector per renderer.')
    }
    const stopDiagnostics = this.diagnostics.connect()
    owners.add(this.renderer)
    this.connected = true
    this.autoReset = info.autoReset
    info.autoReset = false
    this.attributes = {
      ...this.options.attributes,
      ...this.options.getAttributes?.(),
    }
    this.output = this.readOutput()
    return () => {
      if (!this.connected) {
        return
      }
      this.report()
      this.connected = false
      owners.delete(this.renderer)
      info.autoReset = this.autoReset
      stopDiagnostics()
      this.clearWindow()
      this.skipFrame = true
    }
  }

  /** Actual finish-to-finish wall interval in seconds, never a clamped simulation delta. */
  endFrame(delta: number) {
    if (!this.connected) {
      return
    }
    const valid = !this.skipFrame && Number.isFinite(delta) && delta > 0
    this.skipFrame = false
    const ms = valid ? delta * 1000 : 0
    const {render, compute, memory} = this.renderer.info
    this.diagnostics.endFrame(ms, this.attributes, () => ({
      ...this.options.getHitchAttributes?.(),
      'three.frame.id': this.renderer.info.frame,
      'render.passes': render.frameCalls,
      'render.draw_calls': render.drawCalls,
      'render.triangles': render.triangles,
      'compute.calls': compute.frameCalls,
      ...Object.fromEntries(Object.entries(this.output).map(([name, value]) => [`output.${name}`, value])),
      'output.pixels': this.output.width * this.output.height,
      ...this.memorySnapshot(),
      ...Object.fromEntries(Object.entries(this.inventory()).map(([name, value]) => [`scene.${name}`, value])),
    }), this.parent)
    // Read cheap resource scalars every frame, traverse the scene only on reports/hitches.
    this.previousMemory = {
      bytes: memory.total,
      programs: memory.programs,
      textures: memory.textures,
      geometries: memory.geometries,
    }
    if (!valid) {
      return
    }
    this.duration.add(ms)
    const values = [render.frameCalls, render.drawCalls, render.triangles, render.points, render.lines, compute.frameCalls]
    for (const [index, value] of values.entries()) {
      this.work[index].add(value)
    }
    for (const [index, threshold] of thresholds.entries()) {
      if (ms > threshold) {
        this.slow[index]++
      }
    }
    if (this.duration.sum >= this.intervalMs || this.duration.count === this.duration.capacity) {
      this.report()
    }
  }

  /** Flush observed foreground work, then exclude the hidden/resume interval. */
  reset() {
    this.report()
    this.diagnostics.reset()
    this.clearWindow()
    this.skipFrame = true
    this.previousMemory = {}
  }

  private clearWindow() {
    this.duration.reset()
    for (const distribution of this.work) {
      distribution.reset()
    }
    this.slow.fill(0)
  }

  private inventory() {
    let objects = 0
    let meshes = 0
    let instances = 0
    let visibleMeshes = 0
    this.scene.traverse(object => {
      objects++
      if (object instanceof Mesh) {
        meshes++
      }
      if (object instanceof InstancedMesh) {
        instances += object.count
      }
    })
    this.scene.traverseVisible(object => {
      if (object instanceof Mesh) {
        visibleMeshes++
      }
    })
    return {
      objects,
      meshes,
      visible_meshes: visibleMeshes,
      instances,
    }
  }

  private memorySnapshot() {
    const {memory} = this.renderer.info
    const current = {
      bytes: memory.total,
      programs: memory.programs,
      textures: memory.textures,
      geometries: memory.geometries,
    }
    const result: Record<string, number> = {'memory.render_targets': memory.renderTargets}
    for (const [key, value] of Object.entries(current)) {
      result[`memory.${key}`] = value
      if (this.previousMemory[key] !== undefined) {
        result[`memory.${key}_delta`] = value - this.previousMemory[key]
      }
    }
    for (const [key, name] of Object.entries(memoryNames)) {
      const bytes = memory[(`${key}Size`) as keyof typeof memory]
      if (typeof bytes === 'number') {
        result[`memory.${name}.bytes`] = bytes
      }
    }
    return result
  }

  private readOutput(): Output {
    const size = this.renderer.getDrawingBufferSize(this.size)
    return {
      dpr: this.renderer.getPixelRatio(),
      width: size.x,
      height: size.y,
      samples: this.renderer.samples,
    }
  }

  private report() {
    if (!this.duration.count) {
      return
    }
    const attributes = this.attributes
    const metric = (name: string, value: number, unit = '1') => this.telemetry.metric(`three.${name}`, value, {
      unit,
      attributes,
    })
    const distribution = (name: string, values: Distribution, unit = '1') => {
      for (const [stat, value] of Object.entries(values.summarize())) {
        metric(`${name}.${stat}`, value, unit)
      }
    }
    distribution('frame.duration', this.duration, 'ms')
    metric('fps', this.duration.count / this.duration.sum * 1000, '{frame}/s')
    metric('frame.samples', this.duration.count, '{frame}')
    this.telemetry.count('three.frames', this.duration.count, {
      unit: '{frame}',
      attributes,
    })
    for (const [index, threshold] of thresholds.entries()) {
      this.telemetry.count('three.frames.slow', this.slow[index], {
        unit: '{frame}',
        attributes: {
          ...attributes,
          'threshold.ms': threshold,
        },
      })
    }
    for (const [index, workName] of workNames.entries()) {
      distribution(workName, this.work[index])
    }
    const memory = this.renderer.info.memory
    for (const [key, name] of Object.entries(memoryNames)) {
      metric(`memory.${name}`, memory[key as keyof typeof memoryNames])
      const bytes = memory[(`${key}Size`) as keyof typeof memory]
      if (typeof bytes === 'number') {
        metric(`memory.${name}.bytes`, bytes, 'By')
      }
    }
    metric('memory.total.bytes', memory.total, 'By')
    metric('output.pixel_ratio', this.output.dpr)
    metric('output.width', this.output.width, 'px')
    metric('output.height', this.output.height, 'px')
    metric('output.pixels', this.output.width * this.output.height, '{pixel}')
    metric('output.samples', this.output.samples)
    metric('gpu.timestamp_query.available', Number(this.diagnostics.gpuAvailable && this.diagnostics.inspectorAvailable))
    metric('inspector.available', Number(this.diagnostics.inspectorAvailable))
    metric('browser.long_animation_frame.available', Number(this.diagnostics.longFramesAvailable))
    for (const [name, value] of Object.entries(this.inventory())) {
      metric(`scene.${name}`, value)
    }
    this.clearWindow()
  }
}
