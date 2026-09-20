import type {GalleryState} from '../../src/lib/telemetry/types.ts'

import {expect, test} from 'bun:test'

import {createStore} from 'zustand/vanilla'

import {rooms} from '../../src/lib/gallery/walls.ts'
import SlopGalleryTelemetry from '../../src/lib/telemetry/SlopGalleryTelemetry.ts'

type RequestRecord = {
  body: string
  headers: Headers
  url: string
}
type OtlpAttribute = {
  key: string
  value: {
    boolValue?: boolean
    doubleValue?: number
    intValue?: number
    stringValue?: string
  }
}
type OtlpSpan = {
  attributes: Array<OtlpAttribute>
  events: Array<{name: string}>
  name: string
  parentSpanId?: string
  spanId: string
  traceId: string
}
type OtlpTraces = {resourceSpans?: Array<{scopeSpans: Array<{spans: Array<OtlpSpan>}>}>}

const decoder = new TextDecoder
const bodyText = (body: BodyInit | null | undefined) => {
  if (typeof body === 'string') {
    return body
  }
  if (body instanceof Uint8Array) {
    return decoder.decode(body)
  }
  return ''
}
const requestUrl = (url: RequestInfo | URL) => {
  if (url instanceof Request) {
    return url.url
  }
  return url.toString()
}
const capture = () => {
  const requests: Array<RequestRecord> = []
  const fetch = (async (url, init) => {
    requests.push({
      url: requestUrl(url),
      body: bodyText(init?.body),
      headers: new Headers(init?.headers),
    })
    return requestUrl(url).endsWith('/metrics') ? new Response(null, {status: 204}) : Response.json({})
  }) as typeof globalThis.fetch
  return {
    requests,
    fetch,
  }
}
const traceSpans = (requests: ReadonlyArray<RequestRecord>) => requests.filter(request => request.url.endsWith('/traces')).flatMap(request => {
  const body = JSON.parse(request.body) as OtlpTraces
  return body.resourceSpans?.flatMap(resource => resource.scopeSpans.flatMap(scope => scope.spans)) ?? []
})
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
test('gallery adapters record bounded state and lifecycle data without private gallery contents', async () => {
  const {requests, fetch} = capture()
  const telemetry = new SlopGalleryTelemetry({
    sessionId: 'test-session',
    baseUrl: 'http://gallery.test/',
    interval: false,
    fetch,
  })
  const store = createStore(() => ({
    ...initial,
    apiKey: 'secret-key',
    portraits: [{
      hung: true,
      title: 'private artwork',
      source: 'private image',
    }],
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
  stop()
  stop()
  await telemetry.flush()
  const records = requests.map(request => request.body).join('\n')
  expect(records).toContain('gallery.save')
  expect(records).toContain('gallery.merge.requested')
  expect(records).not.toContain('secret-key')
  expect(records).not.toContain('private artwork')
  expect(records).not.toContain('private-first-id')
  expect(telemetry.resource).toMatchObject({
    'service.name': 'gallery',
    'service.instance.id': 'test-session',
  })
  const metricBodies = requests.filter(request => request.url.endsWith('/metrics')).flatMap(request => request.body.trim().split('\n').filter(Boolean)).map(line => JSON.parse(line) as {
    metric: Record<string, string>
    values: Array<number>
  })
  const roomMetrics = metricBodies.filter(metric => Reflect.get(metric.metric, '__name__') === 'gallery.room.active').slice(-rooms.length)
  expect(Object.fromEntries(roomMetrics.map(metric => [metric.metric.room, metric.values.at(-1)]))).toEqual(Object.fromEntries(rooms.map(room => [room.id, Number(room.id === 'sienna')])))
  const count = requests.length
  store.setState({locked: true})
  events.dispatchEvent(new Event('merge'))
  await telemetry.flush()
  expect(requests).toHaveLength(count)
  await telemetry.shutdown()
})
test('gallery telemetry uses native Victoria metrics and OTLP logs/traces through the same-origin relay', async () => {
  const {requests, fetch} = capture()
  const telemetry = new SlopGalleryTelemetry({
    endpoint: '/relay',
    baseUrl: 'http://gallery.test/',
    interval: false,
    fetch,
    now: () => 1234.5,
  })
  expect(telemetry.sessionId).toMatch(/^[0-9A-Za-z]{15}$/u)
  telemetry.metric('ego.position.x', 4.2, {
    unit: 'm',
    attributes: {room: 'sienna'},
  })
  telemetry.event('verification')
  await telemetry.flush()
  expect(requests.map(item => item.url).toSorted()).toEqual([
    'http://gallery.test/relay/logs',
    'http://gallery.test/relay/metrics',
    'http://gallery.test/relay/traces',
  ])
  const metricsRequest = requests.find(request => request.url.endsWith('/metrics'))!
  const logsRequest = requests.find(request => request.url.endsWith('/logs'))!
  const tracesRequest = requests.find(request => request.url.endsWith('/traces'))!
  const metric = JSON.parse(metricsRequest.body.trim().split('\n')[0]) as unknown
  expect(metric).toMatchObject({
    metric: {
      __name__: 'ego.position.x',
      room: 'sienna',
      'service.name': 'gallery',
    },
    values: [4.2],
    timestamps: [1234],
  })
  expect(JSON.parse(logsRequest.body)).toHaveProperty('resourceLogs')
  expect(JSON.parse(tracesRequest.body)).toHaveProperty('resourceSpans')
  expect(metricsRequest.headers.get('content-type')).toContain('application')
  await telemetry.shutdown()
})
test('startup, gameplay and operations share a session trace with state changes as events', async () => {
  const {requests, fetch} = capture()
  const telemetry = new SlopGalleryTelemetry({
    baseUrl: 'http://gallery.test/',
    interval: false,
    fetch,
  })
  const store = createStore(() => initial)
  const stop = telemetry.connect(store)
  expect(() => telemetry.connect(store)).toThrow('one gallery telemetry')
  await telemetry.wrap('three.init', async () => {})
  store.setState({ready: true})
  store.setState({locked: true})
  const gameplay = telemetry.getContext()!
  store.setState({
    room: 'sienna',
    saveStatus: 'saving',
  })
  await telemetry.wrap('gallery.merge', async () => {})
  store.setState({
    saveStatus: 'saved',
    locked: false,
  })
  stop()
  await telemetry.flush()
  const traces = traceSpans(requests)
  const session = traces.find(trace => trace.name === 'gallery.session')!
  const startup = traces.find(trace => trace.name === 'gallery.startup')!
  const play = traces.find(trace => trace.name === 'gallery.gameplay')!
  expect(traces.every(trace => trace.traceId === session.traceId)).toBe(true)
  expect(play.parentSpanId).toBe(session.spanId)
  expect(startup.parentSpanId).toBe(session.spanId)
  expect(traces.find(trace => trace.name === 'three.init')?.parentSpanId).toBe(startup.spanId)
  expect(traces.find(trace => trace.name === 'gallery.save')?.parentSpanId).toBe(gameplay.spanId)
  expect(traces.find(trace => trace.name === 'gallery.merge')?.parentSpanId).toBe(gameplay.spanId)
  expect(play.events.some(event => event.name === 'gallery.room.changed')).toBe(true)
  expect(traces.some(trace => trace.name === 'gallery.room.changed')).toBe(false)
  expect(telemetry.getContext()).toBeUndefined()
  const detach = telemetry.connect(store)
  expect(telemetry.getContext()?.traceId).not.toBe(session.traceId)
  detach()
  await telemetry.shutdown()
})
