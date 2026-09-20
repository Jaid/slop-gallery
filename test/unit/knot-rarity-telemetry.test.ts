import {expect, test} from 'bun:test'

import VictoriaClient from 'victoria-browser-client'

import recordRarityChange from '../../src/levels/knottingham/recordRarityChange.ts'

type Attribute = {
  key: string
  value: {
    boolValue?: boolean
    doubleValue?: number
    intValue?: number
    stringValue?: string
  }
}
const values = (entries: ReadonlyArray<Attribute>) => Object.fromEntries(entries.map(({key, value}) => [key, value.stringValue ?? value.doubleValue ?? value.intValue ?? value.boolValue]))
const decoder = new TextDecoder
const text = (body: BodyInit | null | undefined) => {
  if (typeof body === 'string') {
    return body
  }
  if (body instanceof Uint8Array) {
    return decoder.decode(body)
  }
  return ''
}
test('explicit sign edits emit correlated logs and traces with stable identity and before/after values', async () => {
  const requests: Array<{
    body: string
    url: string
  }> = []
  const telemetry = new VictoriaClient({
    serviceName: 'knottingham-rarity-test',
    baseUrl: 'http://telemetry.test/',
    interval: false,
    endpoints: {
      metrics: false,
      logs: '/logs',
      traces: '/traces',
    },
    resource: {'service.instance.id': 'unit-test'},
    fetch: async (url, init) => {
      requests.push({
        url,
        body: text(init.body),
      })
      return Response.json({})
    },
  })
  try {
    recordRarityChange(telemetry, {
      id: 'washi_lantern',
      candidateId: 'claude_fable',
      title: 'Washi Lantern',
      baseline: 1,
      previous: 3,
      value: 4,
      sequence: 7,
    })
    await telemetry.flush()
    const logRequest = requests.find(request => request.url.endsWith('/logs'))!
    const traceRequest = requests.find(request => request.url.endsWith('/traces'))!
    const logBody = JSON.parse(logRequest.body) as {
      resourceLogs: Array<{
        resource: {attributes: Array<Attribute>}
        scopeLogs: Array<{logRecords: Array<{
          attributes: Array<Attribute>
          spanId: string
          traceId: string
        }>}>
      }>
    }
    const traceBody = JSON.parse(traceRequest.body) as {
      resourceSpans: Array<{
        resource: {attributes: Array<Attribute>}
        scopeSpans: Array<{spans: Array<{
          attributes: Array<Attribute>
          name: string
          spanId: string
          traceId: string
        }>}>
      }>
    }
    const log = logBody.resourceLogs[0].scopeLogs[0].logRecords[0]
    const span = traceBody.resourceSpans[0].scopeSpans[0].spans[0]
    expect(values(log.attributes)).toMatchObject({
      'event.name': 'knot.rarity.changed',
      'knot.id': 'washi_lantern',
      'knot.candidate.id': 'claude_fable',
      'rarity.baseline': 1,
      'rarity.previous': 3,
      'rarity.value': 4,
      'edit.sequence': 7,
      'edit.source': 'sign',
    })
    expect(span.name).toBe('knot.rarity.changed')
    expect(values(span.attributes)).toEqual(values(log.attributes))
    expect(log.traceId).toBe(span.traceId)
    expect(log.spanId).toBe(span.spanId)
    expect(values(traceBody.resourceSpans[0].resource.attributes)['service.instance.id']).toBe('unit-test')
    expect(requests.some(request => request.url.includes('metrics'))).toBe(false)
  } finally {
    await telemetry.shutdown()
  }
})
