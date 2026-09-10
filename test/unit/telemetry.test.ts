import type {GalleryState} from '../../src/lib/telemetry/types.ts'
import type {ExportBatch, Metric} from 'telemethree'

import {expect, test} from 'bun:test'
import {createServer} from 'node:http'

import {createStore} from 'zustand/vanilla'

import {rooms} from '../../src/lib/gallery/walls.ts'
import {SlopGalleryTelemetry} from '../../src/lib/telemetry/SlopGalleryTelemetry.ts'
import {VictoriaExporter} from '../../src/lib/telemetry/VictoriaExporter.ts'
import {createVictoriaRelay} from '../../src/lib/telemetry/vite.ts'

async function status(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  await response.body?.cancel()
  return response.status
}
const initial: GalleryState = {
  portraits: [{hung: true}],
  room: 'lobby',
  ready: false,
  locked: false,
  held: null,
  inspecting: null,
  panel: null,
  ai: false,
  narration: null,
  saveStatus: 'saved',
  storageRecoveryRequired: false,
  revision: 0,
  resetEpoch: 0,
}
test('gallery adapters record bounded state, lifecycle events and save spans, then detach cleanly', async () => {
  const batches: Array<ExportBatch> = []
  const telemetry = new SlopGalleryTelemetry({
    sessionId: 'test-session',
    exporter: {
      export: async batch => {
        batches.push(structuredClone(batch))
      },
    },
  })
  const store = createStore(() => ({
    ...initial,
    apiKey: 'secret-key',
    portraits: [
      {
        hung: true,
        title: 'private artwork',
        source: 'private image',
      },
    ],
  }))
  const events = new EventTarget
  const stop = telemetry.connect(store, events)
  store.setState({
    room: 'sienna',
    ready: true,
    saveStatus: 'saving',
  })
  store.setState({saveStatus: 'error'})
  events.dispatchEvent(new CustomEvent('merge', {detail: ['private-first-id', 'private-second-id']}))
  telemetry.sample(store.getState())
  await telemetry.flush()
  stop()
  stop()
  await telemetry.flush()
  const records = JSON.stringify(batches)
  expect(records).toContain('gallery.save')
  expect(records).toContain('gallery.merge.requested')
  expect(records).not.toContain('secret-key')
  expect(records).not.toContain('private artwork')
  expect(records).not.toContain('private-first-id')
  expect(batches[0]!.resource).toMatchObject({
    'service.name': 'slop-gallery',
    'service.instance.id': 'test-session',
  })
  const count = batches.length
  store.setState({locked: true})
  events.dispatchEvent(new Event('merge'))
  await telemetry.flush()
  expect(batches).toHaveLength(count)
  const metrics = batches.filter(batch => batch.signal === 'metrics').flatMap(batch => batch.records) as Array<Metric>
  expect(metrics.filter(metric => metric.name === 'gallery.room.active').slice(-rooms.length).map(metric => metric.value)).toEqual(rooms.map(room => Number(room.id === 'sienna')))
  await telemetry.dispose()
})
test('Victoria uses native JSON metrics and the existing OTLP logs/traces endpoints', async () => {
  const requests: Array<{init: RequestInit | undefined
    url: string}> = []
  const request = (async (url, init) => {
    requests.push({
      url: url instanceof Request ? url.url : String(url),
      init,
    })
    return requests.at(-1)!.url.endsWith('/metrics') ? new Response(null, {status: 204}) : Response.json({})
  }) as typeof fetch
  const exporter = new VictoriaExporter({
    endpoint: '/unused',
    endpoints: {
      metrics: '/relay/metrics',
      logs: '/relay/logs',
      traces: '/relay/traces',
    },
    fetch: request,
  })
  const telemetry = new SlopGalleryTelemetry({
    exporter,
    now: () => 1234.5,
  })
  telemetry.metric('ego.position.x', 4.2, {
    unit: 'm',
    attributes: {room: 'sienna'},
  })
  telemetry.event('verification')
  await telemetry.flush()
  expect(requests.map(item => item.url)).toEqual(['/relay/metrics', '/relay/logs', '/relay/traces'])
  const lines = (requests[0]!.init?.body as string).trim().split('\n')
  const metric: unknown = JSON.parse(lines[0]!)
  expect(metric).toMatchObject({
    metric: {
      __name__: 'ego.position.x',
      room: 'sienna',
      'service.name': 'slop-gallery',
    },
    values: [4.2],
    timestamps: [1234],
  })
  expect(JSON.parse((requests[1]!.init?.body as string))).toHaveProperty('resourceLogs')
  expect(JSON.parse((requests[2]!.init?.body as string))).toHaveProperty('resourceSpans')
})
test('relay restricts routes, methods, origins, content types and payload size without forwarding credentials', async () => {
  const calls: Array<{init: RequestInit | undefined
    url: string}> = []
  const upstream = (async (url, init) => {
    calls.push({
      url: url instanceof Request ? url.url : String(url),
      init,
    })
    return Response.json({})
  }) as typeof fetch
  const relay = createVictoriaRelay({fetch: upstream})
  const server = createServer((request, response) => relay(request, response, () => {
    response.writeHead(404).end()
  }))
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing server port.')
  }
  const url = `http://127.0.0.1:${address.port}`
  try {
    expect(await status(`${url}/api/telemetry/metrics`)).toBe(405)
    expect(await status(`${url}/api/telemetry/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.test',
      },
      body: '{}',
    })).toBe(403)
    expect(await status(`${url}/api/telemetry/logs`, {
      method: 'POST',
      body: '{}',
    })).toBe(415)
    expect(await status(`${url}/api/telemetry/other`, {method: 'POST'})).toBe(404)
    expect(await status(`${url}/api/telemetry/logs`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: 'x'.repeat(262_145),
    })).toBe(413)
    expect(calls).toHaveLength(0)
    const response = await fetch(`${url}/api/telemetry/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'key=secret',
        Authorization: 'secret',
      },
      body: '{}',
    })
    expect(response.status).toBe(200)
    expect(calls[0]!.url).toBe('http://10.0.0.22:4318/v1/logs')
    expect(calls[0]!.init?.headers).toEqual({'Content-Type': 'application/json'})
    expect(await status(`${url}/api/telemetry/metrics`, {
      method: 'POST',
      headers: {'Content-Type': 'application/stream+json'},
      body: '{}\n',
    })).toBe(200)
    expect(calls[1]!.url).toBe('http://10.0.0.22:3304/api/v1/import')
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }))
  }
})
test('native metrics coalesce millisecond collisions and reject misleading HTML success', async () => {
  let body = ''
  let statusCode = 204
  const request = (async (_, init) => {
    body = init?.body as string
    return new Response(null, {status: statusCode})
  }) as typeof fetch
  const telemetry = new SlopGalleryTelemetry({
    now: () => 1000,
    exporter: new VictoriaExporter({
      endpoint: '/relay',
      fetch: request,
    }),
  })
  telemetry.count('actions', 1)
  telemetry.count('actions', 2)
  await telemetry.flush()
  expect(body.trim().split('\n')).toHaveLength(1)
  expect(JSON.parse(body)).toMatchObject({
    values: [3],
    timestamps: [1000],
  })
  statusCode = 200
  telemetry.metric('gauge', 1)
  await telemetry.flush()
  expect(telemetry.status().metrics).toMatchObject({
    pending: 0,
    dropped: 1,
    lastError: 'Expected HTTP 204 from VictoriaMetrics JSON import.',
  })
})
test('startup, gameplay and operations share a session trace with state changes as events', async () => {
  const batches: Array<ExportBatch> = []
  const telemetry = new SlopGalleryTelemetry({
    exporter: {
      export: async batch => {
        batches.push(structuredClone(batch))
      },
    },
  })
  const store = createStore(() => initial)
  const stop = telemetry.connect(store)
  expect(() => telemetry.connect(store)).toThrow('one gallery telemetry')
  await telemetry.trace('three.init', () => {})
  store.setState({ready: true})
  store.setState({locked: true})
  const gameplay = telemetry.getContext()!
  store.setState({
    room: 'sienna',
    saveStatus: 'saving',
  })
  await telemetry.trace('gallery.merge', () => {})
  store.setState({
    saveStatus: 'saved',
    locked: false,
  })
  stop()
  await telemetry.flush()
  const traces = batches.filter(batch => batch.signal === 'traces').flatMap(batch => batch.records) as Array<import('telemethree').Trace>
  const session = traces.find(trace => trace.name === 'gallery.session')!
  const startup = traces.find(trace => trace.name === 'gallery.startup')!
  const play = traces.find(trace => trace.name === 'gallery.gameplay')!
  expect(traces.every(trace => trace.traceId === session.traceId)).toBe(true)
  expect(play.parentSpanId).toBe(session.spanId)
  expect(startup.parentSpanId).toBe(session.spanId)
  expect(traces.find(trace => trace.name === 'three.init')?.parentSpanId).toBe(startup.spanId)
  expect(traces.find(trace => trace.name === 'gallery.save')?.parentSpanId).toBe(gameplay.spanId)
  expect(traces.find(trace => trace.name === 'gallery.merge')?.parentSpanId).toBe(gameplay.spanId)
  expect(play.events?.some(event => event.name === 'gallery.room.changed')).toBe(true)
  expect(traces.some(trace => trace.name === 'gallery.room.changed')).toBe(false)
  expect(telemetry.getContext()).toBeUndefined()
  const detach = telemetry.connect(store)
  expect(telemetry.getContext()?.traceId).not.toBe(session.traceId)
  detach()
  await telemetry.dispose()
})
