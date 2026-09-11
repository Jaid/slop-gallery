import type Span from './Span.ts'
import type Telemetry from './Telemetry.ts'
import type {DescribeRenderPass, PassSample} from './ThreeInspector.ts'
import type {Attributes, TraceContext} from './types.ts'
import type {WebGPURenderer} from 'three/webgpu'

import {InspectorBase} from 'three/webgpu'

import ThreeInspector from './ThreeInspector.ts'

// r186 public backend API is not yet represented by @types/three r185.
export type TimestampBackend = WebGPURenderer['backend'] & {
  device?: {features: {has: (name: string) => boolean}}
  getTimestamp: (uid: string) => number
  getTimestampFrames: (type: string) => Array<number>
  hasTimestampQuery: (uid: string) => boolean
  trackTimestamp: boolean
}
export type ThreeDiagnosticsOptions = {
  describePass?: DescribeRenderPass
  gpuIntervalMs?: number
  hitchCooldownMs?: number
  hitchThresholdMs?: number
}
type LongFrame = PerformanceEntry & {
  blockingDuration: number
  renderStart: number
  scripts: ReadonlyArray<{duration: number
    forcedStyleAndLayoutDuration: number
    invokerType: string
    sourceFunctionName: string
    sourceURL: string}>
  styleAndLayoutStart: number
}
type PendingHitch = {end: number
  passes: Array<PassSample>
  span: Span
  start: number
  timer: ReturnType<typeof setTimeout>}

/** Sparse exact-frame GPU samples and bounded forensic traces. No render-loop awaits. */
export default class ThreeDiagnostics {
  readonly gpuAvailable: boolean
  readonly inspector: ThreeInspector
  readonly longFramesAvailable = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
  private readonly backend: TimestampBackend
  private connected = false
  private generation = 0
  private readonly gpuIntervalMs: number
  private readonly hitchCooldownMs: number
  private readonly hitchThresholdMs: number
  private readonly lastHitch = [-Infinity, -Infinity, -Infinity]
  private readonly longFrames: Array<LongFrame> = []
  private nextGpu = 0
  private observer?: PerformanceObserver
  private readonly pending = new Set<PendingHitch>
  private readonly previousInspector: InspectorBase
  private readonly previousTracking: boolean
  private resolving = false
  private sampled = false

  constructor(private readonly telemetry: Telemetry, private readonly renderer: WebGPURenderer, options: ThreeDiagnosticsOptions = {}) {
    this.backend = renderer.backend as TimestampBackend
    this.previousInspector = renderer.inspector
    this.previousTracking = this.backend.trackTimestamp
    this.gpuAvailable = this.previousTracking && this.backend.device?.features.has('timestamp-query') === true
    this.inspector = new ThreeInspector(telemetry.now, options.describePass)
    this.gpuIntervalMs = options.gpuIntervalMs ?? 1000
    this.hitchThresholdMs = options.hitchThresholdMs ?? 100
    this.hitchCooldownMs = options.hitchCooldownMs ?? 5000
    for (const value of [this.gpuIntervalMs, this.hitchThresholdMs, this.hitchCooldownMs]) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError('Diagnostic intervals and thresholds must be positive.')
      }
    }
  }

  get inspectorAvailable() {
    return this.renderer.inspector === this.inspector
  }

  beginFrame() {
    this.inspector.reset()
    this.sampled = this.gpuAvailable && this.inspectorAvailable && !this.resolving && this.telemetry.now() >= this.nextGpu
    if (this.gpuAvailable && this.inspectorAvailable) {
      this.backend.trackTimestamp = this.sampled
    }
  }

  connect() {
    this.connected = true
    // Never steal a user-installed inspector or its timestamp tracking policy.
    if (this.previousInspector.constructor === InspectorBase) {
      this.renderer.inspector = this.inspector
      if (this.gpuAvailable) {
        this.backend.trackTimestamp = false
      }
    }
    if (this.longFramesAvailable) {
      this.observer = new PerformanceObserver(list => {
        this.longFrames.push(...list.getEntries() as Array<LongFrame>)
        this.longFrames.splice(0, Math.max(0, this.longFrames.length - 16))
      })
      this.observer.observe({type: 'long-animation-frame'})
    }
    return () => {
      this.reset()
      this.connected = false
      this.observer?.disconnect()
      if (this.inspectorAvailable) {
        this.renderer.inspector = this.previousInspector
        this.backend.trackTimestamp = this.previousTracking
      }
    }
  }

  endFrame(durationMs: number, attributes: Attributes, snapshot: () => Attributes, parent?: TraceContext) {
    const end = this.telemetry.now()
    let hitch: PendingHitch | undefined
    if (durationMs >= this.hitchThresholdMs) {
      const severity = [250, 1000].filter(threshold => durationMs >= threshold).length
      if (end - this.lastHitch[severity] >= this.hitchCooldownMs && this.pending.size < 4) {
        for (let level = 0; level <= severity; level++) {
          this.lastHitch[level] = end
        }
        const start = end - durationMs
        const span = this.telemetry.startSpan('three.frame.hitch', {
          ...attributes,
          ...snapshot(),
          'frame.duration_ms': durationMs,
          'render.pass_details.dropped': this.inspector.dropped,
          'gpu.sampled': this.sampled,
        }, parent, start)
        hitch = {
          span,
          start,
          end,
          passes: this.inspector.passes.map(pass => ({...pass})),
          timer: setTimeout(() => this.finishHitch(hitch!), 500),
        }
        this.pending.add(hitch)
        this.nextGpu = 0
      }
      // An unexpected hitch cannot be timed retroactively. Sample its next frame.
    }
    if (this.sampled) {
      this.sampled = false
      this.nextGpu = hitch ? 0 : end + this.gpuIntervalMs
      this.resolving = true
      // eslint-disable-next-line typescript/no-floating-promises -- resolve catches diagnostic failures; rendering must never await a GPU readback.
      void this.resolve(this.inspector.passes.map(pass => ({...pass})), {...attributes}, hitch, this.generation, this.inspector.dropped === 0, durationMs)
    }
  }

  reset() {
    this.generation++
    this.sampled = false
    this.nextGpu = 0
    if (this.gpuAvailable && this.inspectorAvailable) {
      this.backend.trackTimestamp = false
    }
    for (const hitch of this.pending) {
      this.finishHitch(hitch)
    }
    this.longFrames.length = 0
    this.inspector.reset()
  }

  private finishHitch(hitch: PendingHitch) {
    if (!this.pending.delete(hitch)) {
      return
    }
    clearTimeout(hitch.timer)
    // The observer runs after presentation. Hold the hitch briefly without extending
    // its duration or waiting indefinitely for a GPU readback.
    for (const frame of this.longFrames) {
      const start = performance.timeOrigin + frame.startTime
      if (start >= hitch.end || start + frame.duration <= hitch.start) {
        continue
      }
      hitch.span.addEvent('browser.long_animation_frame', {
        duration_ms: frame.duration,
        blocking_duration_ms: frame.blockingDuration,
        render_start_ms: frame.renderStart,
        style_and_layout_start_ms: frame.styleAndLayoutStart,
      }, start)
      for (const script of frame.scripts.toSorted((a, b) => b.duration - a.duration).slice(0, 4)) {
        let source = ''
        try {
          const url = new URL(script.sourceURL)
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            source = (url.origin + url.pathname).slice(0, 200)
          }
        } catch {}
        hitch.span.addEvent('browser.long_animation_frame.script', {
          duration_ms: script.duration,
          invoker_type: script.invokerType.slice(0, 80),
          'source.url': source,
          'source.function': script.sourceFunctionName.slice(0, 120),
          forced_style_and_layout_ms: script.forcedStyleAndLayoutDuration,
        }, start)
      }
    }
    // Most expensive contexts first: the Span event byte budget may truncate the tail.
    for (const pass of hitch.passes.toSorted((a, b) => (b.gpuMs ?? b.cpuMs ?? 0) - (a.gpuMs ?? a.cpuMs ?? 0))) {
      const attributes: Record<string, number | string> = {
        uid: pass.uid,
        kind: pass.kind,
      }
      if (pass.name) {
        attributes.name = pass.name
      }
      if (pass.cpuMs !== undefined) {
        attributes['cpu.inclusive_ms'] = pass.cpuMs
      }
      if (pass.gpuMs !== undefined) {
        attributes['gpu.duration_ms'] = pass.gpuMs
      }
      if (pass.width !== undefined) {
        attributes['target.width'] = pass.width
      }
      if (pass.height !== undefined) {
        attributes['target.height'] = pass.height
      }
      if (pass.samples !== undefined) {
        attributes['target.samples'] = pass.samples
      }
      hitch.span.addEvent(pass.kind === 'compute' ? 'three.compute.pass' : 'three.render.pass', attributes, pass.start)
    }
    hitch.span.end('ok', {}, hitch.end)
  }

  private async resolve(passes: Array<PassSample>, attributes: Attributes, hitch: PendingHitch | undefined, generation: number, complete: boolean, frameDurationMs: number) {
    try {
      // Start both types synchronously while tracking is enabled. Subsequent frames
      // may disable writes while these readbacks are pending.
      const results = await Promise.allSettled((['render', 'compute'] as const).map(async type => {
        const selected = passes.filter(pass => pass.kind === 'compute' === (type === 'compute'))
        if (selected.length) {
          await this.resolveType(type, selected, attributes, hitch, generation, complete, frameDurationMs)
        }
      }))
      const failed = results.find(result => result.status === 'rejected')
      if (failed?.status === 'rejected') {
        throw failed.reason
      }
    } catch (error) {
      if (this.connected && generation === this.generation) {
        this.telemetry.log('GPU timing resolution failed.', 'warn', {'error.type': error instanceof Error ? error.name : typeof error})
      }
    } finally {
      this.resolving = false
    }
  }

  private async resolveType(type: 'compute' | 'render', passes: Array<PassSample>, attributes: Attributes, hitch: PendingHitch | undefined, generation: number, complete: boolean, frameDurationMs: number) {
    await this.renderer.resolveTimestampsAsync(type)
    if (!this.connected || generation !== this.generation) {
      return
    }
    const frames = this.backend.getTimestampFrames(type)
    // Never interpret info.*.timestamp or a zero as proof of a fresh measurement.
    if (!passes.every(pass => frames.includes(Number(/:f(\d+)$/u.exec(pass.uid)?.[1])) && this.backend.hasTimestampQuery(pass.uid))) {
      return
    }
    let total = 0
    for (const pass of passes) {
      const duration = this.backend.getTimestamp(pass.uid)
      if (!Number.isFinite(duration) || duration < 0) {
        return
      }
      pass.gpuMs = duration
      total += duration
    }
    if (complete) {
      if (frameDurationMs > 0) {
        this.telemetry.metric(`three.gpu.${type}.frame_duration`, frameDurationMs, {
          unit: 'ms',
          attributes,
        })
      }
      this.telemetry.metric(`three.gpu.${type}.duration`, total, {
        unit: 'ms',
        attributes,
      })
      this.telemetry.count(`three.gpu.${type}.samples`, 1, {
        unit: '{frame}',
        attributes,
      })
      hitch?.span.addEvent('three.gpu.sample', {
        type,
        'gpu.duration_ms': total,
      }, hitch.end)
    }
    for (const pass of passes) {
      const detail = hitch?.passes.find(candidate => candidate.uid === pass.uid)
      if (detail) {
        detail.gpuMs = pass.gpuMs
      }
    }
  }
}
