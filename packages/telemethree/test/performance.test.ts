import type {TimestampBackend} from '../src/ThreeDiagnostics.ts'
import type {ComputeNode, WebGPURenderer} from 'three/webgpu'

import {expect, test} from 'bun:test'

import Info from 'three/src/renderers/common/Info.js'
import {InspectorBase, PerspectiveCamera, RenderTarget, Scene, Vector2} from 'three/webgpu'

import {ThreeStatistics} from '../src/main.ts'
import ThreeDiagnostics from '../src/ThreeDiagnostics.ts'
import ThreeInspector from '../src/ThreeInspector.ts'
import TestTelemetry from './TestTelemetry.ts'

function fixture() {
  let now = performance.timeOrigin + 1000
  const telemetry = new TestTelemetry(() => now)
  const renderer = {
    info: new Info,
    inspector: new InspectorBase,
    samples: 0,
    getPixelRatio: () => 2,
    getDrawingBufferSize: (target: Vector2) => target.set(1600, 900),
    backend: {
      isWebGPUBackend: true,
      trackTimestamp: false,
    },
  } as unknown as WebGPURenderer
  return {
    telemetry,
    renderer,
    metrics: () => telemetry.metrics,
    traces: () => telemetry.traces,
    advance: (ms: number) => {
      now += ms
    },
  }
}
test('all workload distributions share frame samples, room boundaries and exact slow counters', async () => {
  const {telemetry, renderer, metrics} = fixture()
  let room = 'sienna'
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {
    getAttributes: () => ({room}),
    intervalMs: 1000,
  })
  const stop = stats.connect()
  stats.beginFrame()
  stats.endFrame(0)
  for (const [duration, passes, draws] of [[10, 2, 20], [40, 6, 80]]) {
    stats.beginFrame()
    renderer.info.render.frameCalls = passes!
    renderer.info.render.drawCalls = draws!
    stats.endFrame(duration / 1000)
  }
  room = 'lobby'
  stats.beginFrame()
  renderer.info.render.frameCalls = 100
  stats.endFrame(0.02)
  stop()
  const sienna = metrics().filter(metric => metric.attributes.room === 'sienna')
  expect(Object.fromEntries(sienna.map(metric => [metric.name, metric.value]))).toMatchObject({
    'three.frame.duration.mean': 25,
    'three.frame.duration.p50': 10,
    'three.render.passes.mean': 4,
    'three.render.passes.max': 6,
    'three.render.draw_calls.mean': 50,
    'three.frames': 2,
  })
  expect(sienna.filter(metric => metric.name === 'three.frames.slow').map(metric => metric.value)).toEqual([1, 1, 0, 0, 0, 0])
  expect(metrics().find(metric => metric.name === 'three.render.passes.mean' && metric.attributes.room === 'lobby')?.value).toBe(100)
  expect(metrics().some(metric => metric.name === 'three.render.passes')).toBe(false)
})
test('capacity, output changes and visibility flush without losing or inventing samples', async () => {
  const {telemetry, renderer, metrics} = fixture()
  const size = new Vector2(1600, 900)
  renderer.getDrawingBufferSize = target => target.copy(size)
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {maxSamples: 2})
  const stop = stats.connect()
  stats.endFrame(0)
  for (const delta of [0.01, 0.02, 0.03]) {
    stats.beginFrame()
    stats.endFrame(delta)
  }
  size.set(800, 450)
  stats.beginFrame()
  stats.endFrame(0.04)
  stats.reset()
  stats.beginFrame()
  stats.endFrame(20)
  stats.beginFrame()
  stats.endFrame(Number.NaN)
  stats.beginFrame()
  stats.endFrame(0.05)
  stop()
  const samples = metrics().filter(metric => metric.name === 'three.frame.samples').map(metric => metric.value)
  expect(samples).toEqual([2, 1, 1, 1])
  expect(metrics().filter(metric => metric.name === 'three.frames').map(metric => metric.value)).toEqual([2, 3, 4, 5])
  expect(metrics().filter(metric => metric.name === 'three.output.width').map(metric => metric.value)).toEqual([1600, 1600, 800, 800])
  expect(metrics().some(metric => metric.name === 'three.frame.duration.max' && metric.value > 50)).toBe(false)
})
test('memory breakdown has byte estimates but no fabricated geometry or target byte fields', async () => {
  const {telemetry, renderer, metrics} = fixture()
  Object.assign(renderer.info.memory, {
    total: 1000,
    texturesSize: 700,
    attributesSize: 200,
    indexAttributesSize: 100,
    renderTargets: 3,
  })
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {intervalMs: 1})
  const stop = stats.connect()
  stats.endFrame(0)
  stats.endFrame(0.01)
  stop()
  expect(Object.fromEntries(metrics().map(metric => [metric.name, metric.value]))).toMatchObject({
    'three.memory.total.bytes': 1000,
    'three.memory.textures.bytes': 700,
    'three.memory.attributes.bytes': 200,
    'three.memory.index_attributes.bytes': 100,
    'three.memory.render_targets': 3,
    'three.output.pixel_ratio': 2,
    'three.output.pixels': 1_440_000,
    'three.gpu.timestamp_query.available': 0,
  })
  expect(metrics().some(metric => ['three.memory.geometries.bytes', 'three.memory.render_targets.bytes'].includes(metric.name))).toBe(false)
})
function gpuFixture() {
  const base = fixture()
  const timestamps = new Map<string, number>
  const frames = new Set<number>
  const calls: Array<string> = []
  const backend = Object.assign(base.renderer.backend, {
    trackTimestamp: true,
    device: {features: new Set(['timestamp-query'])},
    getTimestampFrames: () => [...frames],
    hasTimestampQuery: (uid: string) => timestamps.has(uid),
    getTimestamp: (uid: string) => timestamps.get(uid)!,
  }) as TimestampBackend
  const pending = new Map<string, () => void>
  base.renderer.resolveTimestampsAsync = type => {
    expect(backend.trackTimestamp).toBe(true)
    calls.push(type!)
    return new Promise<number>(resolve => {
      pending.set(type!, () => resolve(9999))
    })
  }
  const settle = async () => {
    for (const finish of pending.values()) {
      finish()
    }
    pending.clear()
    await Bun.sleep(0)
  }
  return {
    ...base,
    timestamps,
    frames,
    calls,
    backend,
    settle,
  }
}
test('GPU resolves both types once, checks exact UIDs and keeps captured context across async readback', async () => {
  const {telemetry, renderer, backend, timestamps, frames, calls, settle, metrics, advance} = gpuFixture()
  const diagnostics = new ThreeDiagnostics(telemetry, renderer)
  const previous = renderer.inspector
  const stop = diagnostics.connect()
  diagnostics.beginFrame()
  const camera = new PerspectiveCamera
  renderer.inspector.beginRender('r:1:1:f42', new Scene, camera, null!)
  renderer.inspector.beginCompute('c:1:1:f42', {} as ComputeNode)
  const attributes = {room: 'sienna'}
  diagnostics.endFrame(20, attributes, () => ({}))
  attributes.room = 'lobby'
  expect(calls).toEqual(['render', 'compute'])
  diagnostics.beginFrame()
  expect(backend.trackTimestamp).toBe(false)
  diagnostics.endFrame(20, {}, () => ({}))
  expect(calls).toHaveLength(2)
  timestamps.set('r:1:1:f42', 12)
  timestamps.set('c:1:1:f42', 3)
  frames.add(42)
  await settle()
  expect(metrics().find(metric => metric.name === 'three.gpu.render.duration')).toMatchObject({
    value: 12,
    attributes: {room: 'sienna'},
  })
  expect(metrics().find(metric => metric.name === 'three.gpu.compute.duration')?.value).toBe(3)
  diagnostics.beginFrame()
  expect(backend.trackTimestamp).toBe(false)
  advance(1000)
  diagnostics.beginFrame()
  expect(backend.trackTimestamp).toBe(true)
  stop()
  expect(renderer.inspector).toBe(previous)
  expect(backend.trackTimestamp).toBe(true)
})
test('stale, unavailable and invalidated GPU samples are absent rather than reported as zero', async () => {
  const {telemetry, renderer, timestamps, frames, settle, metrics, advance} = gpuFixture()
  const diagnostics = new ThreeDiagnostics(telemetry, renderer)
  const stop = diagnostics.connect()
  const camera = new PerspectiveCamera
  diagnostics.beginFrame()
  renderer.inspector.beginRender('r:1:1:f2', new Scene, camera, null!)
  diagnostics.endFrame(20, {}, () => ({}))
  frames.add(1)
  timestamps.set('r:1:1:f1', 10)
  await settle()
  advance(1000)
  diagnostics.beginFrame()
  renderer.inspector.beginRender('r:1:1:f3', new Scene, camera, null!)
  diagnostics.endFrame(20, {}, () => ({}))
  frames.add(3)
  timestamps.set('r:1:1:f3', 10)
  diagnostics.reset()
  await settle()
  expect(metrics()).toHaveLength(0)
  stop()
})
test('custom inspectors retain ownership and diagnostics reject invalid intervals', () => {
  const {telemetry, renderer, backend} = gpuFixture()
  class CustomInspector extends InspectorBase {}
  renderer.inspector = new CustomInspector
  const diagnostics = new ThreeDiagnostics(telemetry, renderer)
  const stop = diagnostics.connect()
  diagnostics.beginFrame()
  expect(diagnostics.inspectorAvailable).toBe(false)
  expect(backend.trackTimestamp).toBe(true)
  stop()
  expect(renderer.inspector).toBeInstanceOf(CustomInspector)
  expect(() => new ThreeDiagnostics(telemetry, renderer, {gpuIntervalMs: 0})).toThrow(RangeError)
})
test('hitches retain real stall duration, resource deltas and sparse severity-escalated pass snapshots', async () => {
  const {telemetry, renderer, advance, traces} = fixture()
  const parent = telemetry.startSpan('gameplay')
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {
    getTraceContext: () => parent,
    getHitchAttributes: () => ({'ego.speed': 2}),
  })
  const stop = stats.connect()
  stats.beginFrame()
  stats.endFrame(0)
  for (const ms of [100, 120, 300, 20_000]) {
    stats.beginFrame()
    renderer.inspector.beginRender('r:1:1:f1', new Scene, new PerspectiveCamera, null!)
    renderer.info.memory.total += 100
    advance(ms)
    renderer.inspector.finishRender('r:1:1:f1')
    stats.endFrame(ms / 1000)
  }
  stop()
  expect(traces()).toHaveLength(3)
  expect(traces().map(trace => trace.endTime - trace.startTime)).toEqual([100, 300, 20_000])
  expect(traces()[0]).toMatchObject({
    parentSpanId: parent.spanId,
    attributes: {
      'memory.bytes_delta': 100,
      'ego.speed': 2,
    },
  })
  expect(traces()[0].events?.find(event => event.name === 'three.render.pass')).toMatchObject({
    attributes: {
      kind: 'main',
      'cpu.inclusive_ms': 100,
    },
  })
})
test('inspector handles nested CPU timings, shadow/fullscreen classification and bounded metadata', () => {
  let now = 0
  const inspector = new ThreeInspector(() => now)
  const scene = new Scene
  const camera = new PerspectiveCamera
  const shadow = new RenderTarget
  shadow.texture.name = 'ShadowMap'
  inspector.beginRender('main', scene, camera, null)
  now = 1
  inspector.beginRender('shadow', scene, camera, shadow)
  now = 4
  inspector.finishRender('shadow')
  now = 5
  inspector.finishRender('main')
  expect(inspector.passes.map(pass => [pass.kind, pass.cpuMs])).toEqual([['main', 5], ['shadow', 3]])
  for (let index = 0; index < 200; index++) {
    inspector.beginRender(String(index), scene, camera, null)
  }
  expect(inspector.passes).toHaveLength(128)
  expect(inspector.dropped).toBe(74)
  inspector.reset()
  expect(inspector.passes).toHaveLength(0)
  expect(inspector.dropped).toBe(0)
  shadow.dispose()
})
test('long animation frames join only overlapping hitches and sanitize script URLs', async () => {
  const original = globalThis.PerformanceObserver
  let callback: PerformanceObserverCallback | undefined
  let disconnected = false
  class Observer {
    static supportedEntryTypes = ['long-animation-frame']
    constructor(next: PerformanceObserverCallback) {
      callback = next
    }
    disconnect() {
      disconnected = true
    }
    observe() {}
  }
  globalThis.PerformanceObserver = Observer as unknown as typeof PerformanceObserver
  try {
    const {telemetry, renderer, advance, traces} = fixture()
    const diagnostics = new ThreeDiagnostics(telemetry, renderer)
    const stop = diagnostics.connect()
    expect(diagnostics.longFramesAvailable).toBe(true)
    diagnostics.beginFrame()
    advance(200)
    diagnostics.endFrame(200, {}, () => ({}))
    const entry = {
      startTime: 1050,
      duration: 160,
      blockingDuration: 80,
      renderStart: 1100,
      styleAndLayoutStart: 1150,
      scripts: [
        {
          duration: 100,
          invokerType: 'user-callback',
          sourceURL: 'https://user:password@example.test/src/render.ts?token=secret#private',
          sourceFunctionName: 'renderScene',
          forcedStyleAndLayoutDuration: 3,
        },
      ],
    }
    callback!({
      getEntries: () => [
        entry,
        {
          ...entry,
          startTime: 5000,
        },
      ],
    } as unknown as PerformanceObserverEntryList, {} as PerformanceObserver)
    stop()
    const events = traces()[0].events
    expect(events.filter(event => event.name === 'browser.long_animation_frame')).toHaveLength(1)
    expect(events.find(event => event.name === 'browser.long_animation_frame.script')?.attributes['source.url']).toBe('https://example.test/src/render.ts')
    expect(JSON.stringify(traces())).not.toContain('secret')
    expect(disconnected).toBe(true)
  } finally {
    globalThis.PerformanceObserver = original
  }
})
