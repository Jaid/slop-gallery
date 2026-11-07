import {expect, test} from 'bun:test'

import recordPermalink, {readSearch, redactSearch} from '../../src/lib/telemetry/recordPermalink.ts'
import SlopGalleryTelemetry from '../../src/lib/telemetry/SlopGalleryTelemetry.ts'

const encoder = new TextEncoder
const decoder = new TextDecoder
const pack = (state: Record<string, unknown>) => encoder.encode(JSON.stringify(state)).toBase64({
  alphabet: 'base64url',
  omitPadding: true,
})
test('the permalink input keeps the query as given, without its leading question mark', () => {
  const search = '?audio&telemetry&logs_ingestion_endpoint=https%3A%2F%2Flogs.test%2Finsert%2Fjsonline&item=prop-orb-spook,%20prop-orb-horror'
  expect(redactSearch(search)).toBe(search.slice(1))
  expect(redactSearch('')).toBe('')
})
test('the permalink output is what read-permalink reads, packed state included', () => {
  expect(readSearch(`?audio&fov=70&data=${pack({
    room: 'sienna',
    flying: true,
  })}`)).toEqual({
    audio: '',
    fov: '70',
    room: 'sienna',
    flying: true,
  })
  expect(readSearch('')).toEqual({})
})
test('an OpenRouter key never leaves the page, neither given directly nor packed', () => {
  expect(redactSearch('?openrouter_key=sk-or-v1-secret&ai')).toBe('openrouter_key=redacted&ai')
  expect(readSearch('?openrouter_key=sk-or-v1-secret&ai')).toEqual({
    openrouter_key: 'redacted',
    ai: '',
  })
  // A flag is no secret.
  expect(redactSearch('?openrouter_key=false&openrouter_host=openrouter.nas.lan')).toBe('openrouter_key=false&openrouter_host=openrouter.nas.lan')
  expect(readSearch('?openrouter_key=false')).toEqual({openrouter_key: 'false'})
  const packed = `?audio&data=${pack({
    openrouter_key: 'sk-or-v1-secret',
    room: 'sienna',
  })}`
  expect(redactSearch(packed)).toBe('audio&data=redacted')
  expect(readSearch(packed)).toEqual({
    audio: '',
    openrouter_key: 'redacted',
    room: 'sienna',
  })
  const harmless = `?data=${pack({room: 'sienna'})}`
  expect(redactSearch(harmless)).toBe(harmless.slice(1))
})
test('the permalink goes out as gallery.permalink.read with input and output as JSON', async () => {
  const bodies: Array<string> = []
  const telemetry = new SlopGalleryTelemetry({
    endpoints: {logs: 'https://logs.test/insert/jsonline?_stream_fields=service.name'},
    baseUrl: 'http://gallery.test/',
    interval: false,
    fetch: async (_url, init) => {
      bodies.push(decoder.decode(init.body as Uint8Array))
      return new Response(null, {status: 200})
    },
  })
  recordPermalink(telemetry, '?telemetry&fov=70&openrouter_key=sk-or-v1-secret')
  await telemetry.flush()
  const records = bodies.join('\n')
  expect(records).not.toContain('sk-or-v1-secret')
  const record = JSON.parse(records.trim().split('\n')[0]) as Record<string, unknown>
  expect(record['event.name']).toBe('gallery.permalink.read')
  expect(JSON.parse(record._msg as string)).toEqual({
    input: 'telemetry&fov=70&openrouter_key=redacted',
    output: {
      telemetry: '',
      fov: '70',
      openrouter_key: 'redacted',
    },
  })
  await telemetry.shutdown()
})
