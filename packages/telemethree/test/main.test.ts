import type {ExportBatch, Metric, Trace} from '../src/main.ts'
import type {WebGPURenderer} from 'three/webgpu'

import {expect, test} from 'bun:test'

import Info from 'three/src/renderers/common/Info.js'
import {Group, InspectorBase, InstancedMesh, Mesh, Scene} from 'three/webgpu'

import {ExportError, OtlpHttpExporter, Telemetry, ThreeStatistics} from '../src/main.ts'
import {encodeOtlp, unixNano} from '../src/otlp.ts'

function testRenderer() {
  return {
    info: new Info,
    backend: {isWebGPUBackend: true},
    inspector: new InspectorBase,
    getPixelRatio: () => 2,
    getDrawingBufferSize: (target: {set: (x: number, y: number) => unknown}) => target.set(1920, 1080),
    samples: 0,
  } as unknown as WebGPURenderer
}
function fixture(options: Partial<ConstructorParameters<typeof Telemetry>[0]> = {}) {
  const batches: Array<ExportBatch> = []
  let now = 1000
  const telemetry = new Telemetry({
    now: () => now,
    exporter: {
      export: async batch => {
        batches.push(structuredClone(batch))
      },
    },
    ...options,
  })
  return {
    telemetry,
    batches,
    advance: (ms: number) => {
      now += ms
    },
  }
}
test('gauges and cumulative counters snapshot attributes and preserve start time', async () => {
  const {telemetry, batches, advance} = fixture()
  const attributes = {room: 'amber'}
  telemetry.metric('fps', 120, {attributes})
  attributes.room = 'secret'
  telemetry.count('steps', 2)
  advance(10)
  telemetry.count('steps', 3)
  telemetry.metric('steps', 8)
  telemetry.metric('invalid', Number.NaN)
  telemetry.count('steps', -1)
  await telemetry.flush()
  const records = batches[0]!.records as Array<Metric>
  expect(records.map(record => record.value)).toEqual([120, 2, 5])
  expect(records[0]!.attributes.room).toBe('amber')
  expect(records[2]).toMatchObject({
    time: 1010,
    startTime: 1000,
    kind: 'counter',
  })
  expect(telemetry.status().metrics.dropped).toBe(1)
})
test('traces propagate explicit parent context and finish once on success and failure', async () => {
  const {telemetry, batches, advance} = fixture()
  const parent = telemetry.startSpan('parent')
  await telemetry.trace('child', span => {
    telemetry.log('Inside child.', 'info', {}, span)
    advance(25)
    return 42
  }, {}, parent)
  parent.end()
  parent.end('error')
  const failure = new Error('private provider detail')
  await expect(telemetry.trace('failure', () => {
    throw failure
  })).rejects.toBe(failure)
  await telemetry.flush()
  const traces = batches.find(batch => batch.signal === 'traces')!.records as Array<Trace>
  expect(traces).toHaveLength(3)
  expect(traces[0]).toMatchObject({
    traceId: parent.traceId,
    parentSpanId: parent.spanId,
    startTime: 1000,
    endTime: 1025,
  })
  expect(traces[2]).toMatchObject({
    status: 'error',
    attributes: {'error.type': 'Error'},
  })
  expect(JSON.stringify(batches)).not.toContain('private provider detail')
  expect(parent.traceId).toMatch(/^[\da-f]{32}$/u)
  expect(parent.spanId).toMatch(/^[\da-f]{16}$/u)
})
test('queues and batches are bounded, in-flight records survive concurrent appends', async () => {
  let release: (() => void) | undefined
  const batches: Array<ExportBatch> = []
  const {telemetry} = fixture({
    maxQueueSize: 3,
    maxBatchSize: 2,
    exporter: {
      export: async batch => {
        batches.push(batch)
        await new Promise<void>(resolve => {
          release = resolve
        })
      },
    },
  })
  telemetry.metric('x', 1)
  telemetry.metric('x', 2)
  const first = telemetry.flush()
  expect(telemetry.flush()).toBe(first)
  telemetry.metric('x', 3)
  telemetry.metric('x', 4)
  release!()
  await first
  expect(telemetry.status().metrics).toMatchObject({
    pending: 1,
    sent: 2,
    dropped: 1,
  })
  const second = telemetry.flush()
  release!()
  await second
  expect((batches[1]!.records[0] as Metric).value).toBe(3)
})
test('signal failures are isolated and retry identical data only after backoff', async () => {
  let fail = true
  const calls: Array<ExportBatch> = []
  const {telemetry, advance} = fixture({
    exporter: {
      export: async batch => {
        calls.push(structuredClone(batch))
        if (batch.signal === 'metrics' && fail) {
          throw new ExportError('Busy.', true, 2000)
        }
        if (batch.signal === 'logs') {
          throw new ExportError('Bad request.', false)
        }
      },
    },
  })
  telemetry.metric('x', 1)
  telemetry.log('test')
  telemetry.startSpan('test').end()
  await telemetry.flush()
  expect(telemetry.status().metrics.pending).toBe(1)
  expect(telemetry.status().logs.dropped).toBe(1)
  expect(telemetry.status().traces.sent).toBe(1)
  await telemetry.flush()
  expect(calls).toHaveLength(3)
  fail = false
  advance(3000)
  await telemetry.flush()
  expect(calls[3]).toEqual(calls[0])
  expect(telemetry.status().metrics).toMatchObject({
    pending: 0,
    failures: 0,
    lastError: null,
  })
})
test('partial success is consumed; record size and counter cardinality are bounded', async () => {
  const {telemetry} = fixture({
    maxRecordBytes: 200,
    maxSeries: 2,
    exporter: {
      export: async () => ({
        rejected: 1,
        warning: 'One rejected.',
      }),
    },
  })
  telemetry.log('x'.repeat(300))
  telemetry.count('a', 1, {attributes: {key: 'a'}})
  telemetry.count('a', 1, {attributes: {key: 'b'}})
  telemetry.count('a', 1, {attributes: {key: 'c'}})
  await telemetry.flush()
  expect(telemetry.status().metrics).toMatchObject({
    pending: 0,
    sent: 1,
    dropped: 2,
    lastError: 'One rejected.',
  })
  expect(telemetry.status().logs.dropped).toBe(1)
  await telemetry.dispose()
  telemetry.metric('ignored', 1)
  expect(telemetry.status().metrics.pending).toBe(0)
})
test('OTLP uses numeric enums, nanosecond strings, cumulative sums and correlated logs', async () => {
  const {telemetry, batches} = fixture()
  telemetry.count('steps', 1, {unit: '{step}'})
  const span = telemetry.startSpan('walk')
  telemetry.log('Walking.', 'warn', {moving: true}, span)
  span.end('error')
  await telemetry.flush()
  const metrics = encodeOtlp(batches.find(batch => batch.signal === 'metrics')!)
  expect(metrics.resourceMetrics?.[0]?.scopeMetrics[0]?.metrics[0]).toMatchObject({
    sum: {
      aggregationTemporality: 2,
      isMonotonic: true,
    },
  })
  const logs = encodeOtlp(batches.find(batch => batch.signal === 'logs')!)
  expect(logs.resourceLogs?.[0]?.scopeLogs[0]?.logRecords[0]).toMatchObject({
    severityNumber: 13,
    traceId: span.traceId,
    spanId: span.spanId,
  })
  expect(unixNano(1_700_000_000_123.5)).toBe('1700000000123500000')
})
test('HTTP exporter recognizes partial success, permanent errors and Retry-After', async () => {
  const requests: Array<string> = []
  let response = Response.json({
    partialSuccess: {
      rejectedLogRecords: '1',
      errorMessage: 'Too large.',
    },
  })
  const request = (async url => {
    requests.push(url instanceof Request ? url.url : String(url))
    return response
  }) as typeof fetch
  const exporter = new OtlpHttpExporter({
    endpoint: 'https://collector.test/otlp/',
    fetch: request,
  })
  const batch: ExportBatch = {
    signal: 'logs',
    resource: {},
    records: [
      {
        message: 'Hello.',
        level: 'info',
        attributes: {},
        time: 1000,
      },
    ],
  }
  expect(await exporter.export(batch)).toEqual({
    rejected: 1,
    warning: 'Too large.',
  })
  expect(requests[0]).toBe('https://collector.test/otlp/v1/logs')
  response = new Response('', {
    status: 503,
    headers: {'Retry-After': '3'},
  })
  await expect(exporter.export(batch)).rejects.toMatchObject({
    retryable: true,
    retryAfterMs: 3000,
  })
  response = new Response('', {status: 400})
  await expect(exporter.export(batch)).rejects.toMatchObject({retryable: false})
  response = new Response('<html>Not a collector</html>')
  await expect(exporter.export(batch)).rejects.toMatchObject({retryable: false})
})
test('Three statistics include all passes and distinguish draw calls from cumulative render calls', async () => {
  const {telemetry, batches} = fixture()
  const renderer = testRenderer()
  const {info} = renderer
  info.render.calls = 9999
  info.memory.geometries = 3
  info.memory.textures = 4
  info.memory.total = 1200
  info.memory.programs = 6
  const scene = new Scene
  const hidden = new Group
  hidden.visible = false
  hidden.add(new Mesh)
  scene.add(new Mesh, hidden, new InstancedMesh(undefined, undefined, 8))
  const stats = new ThreeStatistics(telemetry, renderer, scene, {intervalMs: 1000})
  const stop = stats.connect()
  expect(info.autoReset).toBe(false)
  expect(() => new ThreeStatistics(telemetry, renderer, scene).connect()).toThrow()
  stats.endFrame(0.1)
  for (let frame = 1; frame <= 100; frame++) {
    stats.beginFrame()
    info.render.drawCalls += 3
    info.render.triangles += 20
    info.render.drawCalls += 5
    info.render.triangles += 30
    stats.endFrame(0.01)
  }
  await telemetry.flush()
  const metrics = Object.fromEntries((batches[0]!.records as Array<Metric>).map(metric => [metric.name, metric.value]))
  expect(metrics).toMatchObject({
    'three.fps': 100,
    'three.frame.duration.p95': 10,
    'three.frame.duration.p99': 10,
    'three.render.draw_calls.mean': 8,
    'three.render.triangles.mean': 50,
    'three.scene.meshes': 3,
    'three.scene.visible_meshes': 2,
    'three.scene.instances': 8,
  })
  stats.reset()
  stats.endFrame(3600)
  expect(telemetry.status().metrics.pending).toBe(0)
  stop()
  stop()
  expect(info.autoReset).toBe(true)
})
test('p95/p99 use nearest-rank WebGPU frame durations', async () => {
  const {telemetry, batches} = fixture()
  const renderer = testRenderer()
  const {info} = renderer
  info.autoReset = false
  info.render.drawCalls = 7
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {
    intervalMs: 5050,
    maxSamples: 100,
  })
  const stop = stats.connect()
  stats.endFrame(0.01)
  for (let duration = 1; duration <= 100; duration++) {
    stats.endFrame(duration / 1000)
  }
  await telemetry.flush()
  const metrics = Object.fromEntries((batches[0]!.records as Array<Metric>).map(metric => [metric.name, metric.value]))
  expect(metrics['three.frame.duration.p95']).toBe(95)
  expect(metrics['three.frame.duration.p99']).toBe(99)
  expect(metrics['three.fps']).toBeCloseTo(1000 / 50.5)
  expect(metrics['three.render.draw_calls.mean']).toBe(7)
  stop()
  expect(info.autoReset).toBe(false)
})
test('statistics flush at capacity without silently losing older frames', async () => {
  const {telemetry, batches} = fixture()
  const renderer = testRenderer()
  const statistics = new ThreeStatistics(telemetry, renderer, new Scene, {
    intervalMs: 15,
    maxSamples: 3,
  })
  const stop = statistics.connect()
  statistics.endFrame(0.1)
  for (const milliseconds of [1, 2, 3, 4, 5]) {
    statistics.endFrame(milliseconds / 1000)
  }
  await telemetry.flush()
  const metrics = Object.fromEntries((batches[0]!.records as Array<Metric>).map(metric => [metric.name, metric.value]))
  expect(metrics).toMatchObject({
    'three.frame.samples': 3,
    'three.frame.duration.mean': 2,
    'three.frame.duration.p99': 3,
  })
  stop()
})
test('Three statistics reject a renderer running the WebGL fallback backend', () => {
  const {telemetry} = fixture()
  const renderer = {
    info: new Info,
    backend: {isWebGLBackend: true},
  } as unknown as WebGPURenderer
  const statistics = new ThreeStatistics(telemetry, renderer, new Scene)
  expect(() => statistics.connect()).toThrow('native WebGPU')
  expect(renderer.info.autoReset).toBe(true)
})
test('delivery timer leases survive duplicate cleanup and stop after the final owner', async () => {
  const {telemetry, batches} = fixture({flushIntervalMs: 5})
  const first = telemetry.start()
  const second = telemetry.start()
  first()
  first()
  await telemetry.flush()
  telemetry.metric('timer', 1)
  await Bun.sleep(30)
  expect(batches).toHaveLength(1)
  second()
  await telemetry.flush()
  telemetry.metric('timer', 2)
  await Bun.sleep(30)
  expect(batches).toHaveLength(1)
  const third = telemetry.start()
  await Bun.sleep(30)
  expect(batches).toHaveLength(2)
  third()
  await telemetry.dispose()
})
test('OTLP groups a metric descriptor once and rejects malformed partial-success counts', async () => {
  const {telemetry, batches, advance} = fixture()
  telemetry.metric('x', 1)
  advance(1)
  telemetry.metric('x', 2)
  await telemetry.flush()
  const encoded = encodeOtlp(batches[0]!)
  const metrics = encoded.resourceMetrics?.[0]?.scopeMetrics[0]?.metrics
  expect(metrics).toHaveLength(1)
  expect(metrics?.[0]).toMatchObject({gauge: {dataPoints: [{asDouble: 1}, {asDouble: 2}]}})
  for (const rejected of [null, '', ' ', '1.5', -1, {}, true]) {
    const request = async () => Response.json({partialSuccess: {rejectedDataPoints: rejected}})
    const exporter = new OtlpHttpExporter({
      endpoint: '/otlp',
      fetch: request,
    })
    await expect(exporter.export(batches[0]!)).rejects.toMatchObject({retryable: false})
  }
})
