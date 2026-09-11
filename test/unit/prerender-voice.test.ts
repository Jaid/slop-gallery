import type {GeneratedSpeech} from 'grok-speaker'

import {afterEach, beforeEach, expect, mock, spyOn, test} from 'bun:test'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'
import GrokSpeaker from 'grok-speaker'

import prerenderVoice, {parsePrerenderVoiceArgs} from '../../scripts/prerenderVoice.ts'
import pcmWave from '../../src/lib/audio/pcmWave.ts'

type OtlpAttribute = {key: string
  value: {boolValue?: boolean
    doubleValue?: number
    stringValue?: string}}
type OtlpSpan = {attributes: Array<OtlpAttribute>
  name: string
  parentSpanId?: string
  spanId: string
  status: {code: number}
  traceId: string}
type OtlpRequest = {resourceSpans: Array<{resource: {attributes: Array<OtlpAttribute>}
  scopeSpans: Array<{spans: Array<OtlpSpan>}>}>}
const spans = (body: OtlpRequest) => body.resourceSpans.flatMap(resource => resource.scopeSpans.flatMap(scope => scope.spans))
const attributes = (span: OtlpSpan) => Object.fromEntries(span.attributes.map(({key, value}) => [key, value.stringValue ?? value.doubleValue ?? value.boolValue]))
let root: string
let generated: GeneratedSpeech
const caches = new Set<string>
const outputs = new Set<string>
const requests: Array<{body: OtlpRequest
  url: string}> = []
beforeEach(async () => {
  root = await fs.mkdtemp(path.resolve(import.meta.dir, '../../private/agent/prerender-test-'))
  requests.length = 0
  const pcm = Int16Array.from({length: 4800}, (_, i) => Math.sin(i * 0.1) * 1000)
  generated = {
    wav: new Uint8Array(await pcmWave(pcm.buffer, 48_000).arrayBuffer()),
    sampleRate: 48_000,
    duration: 0.1,
    timestamps: [
      {
        char: 'H',
        start: 0,
        end: 0.05,
      }, {
        char: 'i',
        start: 0.05,
        end: 0.1,
      },
    ],
    traceId: 'provider-trace',
  }
})
afterEach(async () => {
  mock.restore()
  await fs.remove(root)
  for (const cache of caches) {
    await fs.remove(cache)
  }
  caches.clear()
  for (const output of outputs) {
    await fs.remove(output)
  }
  outputs.clear()
})
const options = () => ({
  input: 'Hi',
  output: path.resolve(root, 'voice.opus'),
  key: 'xai-test',
  telemetryEndpoint: 'http://victoria.test/v1/traces',
})
const intercept = (respond: (index: number) => Response = () => Response.json({})) => {
  const handler = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (typeof init?.body !== 'string') {
      throw new TypeError('Expected an OTLP JSON body.')
    }
    const body = JSON.parse(init.body) as OtlpRequest
    const entries = spans(body)
    expect(entries.length).toBeGreaterThan(0)
    for (const span of entries) {
      const id = attributes(span)['voice.run.id']
      if (typeof id === 'string') {
        caches.add(path.resolve(import.meta.dir, '../../private/prerender-voice', id))
      }
    }
    requests.push({
      url: url instanceof Request ? url.url : String(url),
      body,
    })
    expect(init.redirect).toBe('error')
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
    return respond(requests.length)
  }
  return spyOn(globalThis, 'fetch').mockImplementation(Object.assign(handler, {preconnect: globalThis.fetch.preconnect}))
}
test('CLI requires named input and defaults forceTelemetry to true', () => {
  expect(parsePrerenderVoiceArgs(['--input', 'Hi'])).toEqual({
    input: 'Hi',
    output: undefined,
    telemetryEndpoint: undefined,
    forceTelemetry: true,
  })
  expect(parsePrerenderVoiceArgs(['--input', 'Hi', '--no-force-telemetry'])?.forceTelemetry).toBe(false)
  expect(parsePrerenderVoiceArgs(['--input', 'Hi', '--force-telemetry'])?.forceTelemetry).toBe(true)
  expect(parsePrerenderVoiceArgs(['--input', 'Hi', '--output', 'hello.opus', '--telemetry-endpoint', 'https://example.test/v1/traces'])).toMatchObject({
    output: 'hello.opus',
    telemetryEndpoint: 'https://example.test/v1/traces',
  })
  expect(parsePrerenderVoiceArgs(['--help'])).toBeUndefined()
  expect(() => parsePrerenderVoiceArgs([])).toThrow('--input is required')
  expect(() => parsePrerenderVoiceArgs(['Hi'])).toThrow()
  expect(() => parsePrerenderVoiceArgs(['--input', 'Hi', '--unknown'])).toThrow()
})
test.each([
  ['unavailable', () => new Response(null, {status: 503})],
  ['HTML login', () => new Response('<html>Sign in</html>', {headers: {'content-type': 'text/html'}})],
  ['malformed JSON', () => new Response('{', {headers: {'content-type': 'application/json'}})],
  ['rejected span', () => Response.json({partialSuccess: {rejectedSpans: '1'}})],
  [
    'partial warning', () => Response.json({
      partialSuccess: {
        rejectedSpans: '0',
        errorMessage: 'Data discarded.',
      },
    }),
  ],
] as const)('fails before synthesis when the preflight returns %s', async (_, response) => {
  intercept(response)
  const generate = spyOn(GrokSpeaker.prototype, 'generate')
  await expect(prerenderVoice(options())).rejects.toThrow('Required Victoria trace delivery failed')
  expect(generate).not.toHaveBeenCalled()
  expect(await fs.pathExists(options().output)).toBe(false)
  expect(requests).toHaveLength(1)
  expect(spans(requests[0].body)[0].name).toBe('voice.prerender.telemetry.preflight')
})
test('a network error blocks synthesis before any paid request', async () => {
  spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused.'))
  const generate = spyOn(GrokSpeaker.prototype, 'generate')
  await expect(prerenderVoice(options())).rejects.toThrow('Required Victoria trace delivery failed')
  expect(generate).not.toHaveBeenCalled()
})
test('generates loud 48 kHz Opus with timings and a correlated trace after an acknowledged preflight', async () => {
  intercept()
  const generate = spyOn(GrokSpeaker.prototype, 'generate').mockImplementation(async (text, settings) => {
    expect(requests).toHaveLength(1)
    expect(text).toEqual({
      text: 'Hi',
      modifier: 'loud',
    })
    expect(settings).toEqual({timestamps: true})
    return generated
  })
  const result = await prerenderVoice(options())
  caches.add(result.cache)
  expect(generate).toHaveBeenCalledTimes(1)
  expect(result.telemetryDelivered).toBe(true)
  expect(await Bun.file(result.timingsPath).json()).toEqual(generated.timestamps)
  const bytes = await Bun.file(result.output).bytes()
  expect(Buffer.from(bytes.subarray(0, 4)).toString()).toBe('OggS')
  const all = requests.flatMap(request => spans(request.body))
  expect(all.every(span => span.traceId === result.traceId)).toBe(true)
  const instanceIds = requests.flatMap(request => request.body.resourceSpans.map(resource => resource.resource.attributes.find(attribute => attribute.key === 'service.instance.id')?.value.stringValue))
  expect(new Set(instanceIds).size).toBe(1)
  expect(instanceIds[0]).toMatch(/^[\dA-Za-z]{15}$/u)
  expect(result.traceId).toMatch(/^[\da-f]{32}$/u)
  const parent = all.find(span => span.name === 'voice.prerender')!
  expect(parent.status.code).toBe(1)
  expect(attributes(parent)).toMatchObject({
    'voice.modifier': 'loud',
    'audio.sample_rate': 48_000,
    'audio.opus.compression_level': 10,
    'xai.trace.id': 'provider-trace',
    'voice.timings.count': 2,
  })
  expect(all.filter(span => span !== parent).every(span => span.parentSpanId === parent.spanId)).toBe(true)
  const timingSpan = all.find(span => span.name === 'voice.prerender.timings')!
  expect(JSON.parse(attributes(timingSpan)['voice.timings.json'] as string)).toEqual(generated.timestamps)
  expect(JSON.stringify(requests)).not.toContain('xai-test')
})
test('retains all character timings across multiple bounded batches, without event truncation', async () => {
  intercept()
  generated.timestamps = Array.from({length: 2300}, (_, i) => ({
    char: 'a',
    start: i / 23_000,
    end: (i + 1) / 23_000,
  }))
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  const result = await prerenderVoice(options())
  caches.add(result.cache)
  const chunks = requests.flatMap(request => spans(request.body)).filter(span => span.name === 'voice.prerender.timings').map(attributes).toSorted((a, b) => Number(a['voice.timings.offset']) - Number(b['voice.timings.offset']))
  const timings = chunks.flatMap(chunk => JSON.parse(chunk['voice.timings.json'] as string) as GeneratedSpeech['timestamps'])
  expect(timings).toEqual(generated.timestamps)
  expect(chunks).toHaveLength(18)
  expect(requests.every(request => spans(request.body).length <= 16)).toBe(true)
})
test('required final telemetry failure preserves previous output and all paid recovery files', async () => {
  intercept(index => {
    return index === 1 ? Response.json({}) : new Response(null, {status: 503})
  })
  const generate = spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  await fs.writeFile(options().output, 'previous voice')
  await expect(prerenderVoice(options())).rejects.toThrow('Recovery files')
  expect(await Bun.file(options().output).text()).toBe('previous voice')
  expect(generate).toHaveBeenCalledTimes(1)
  expect(requests).toHaveLength(2)
  const cache = [...caches][0]
  expect(await Bun.file(path.resolve(cache, 'timings.json')).json()).toEqual(generated.timestamps)
  expect(await Bun.file(path.resolve(cache, 'source.wav')).exists()).toBe(true)
  expect(await Bun.file(path.resolve(cache, 'encoded.opus')).exists()).toBe(true)
  expect(await Bun.file(path.resolve(cache, 'trace.json')).exists()).toBe(true)
  expect(await fs.readdir(root)).toEqual(['voice.opus'])
})
test('explicit best-effort telemetry allows output but reports failed delivery', async () => {
  intercept(() => new Response(null, {status: 503}))
  spyOn(console, 'warn').mockImplementation(() => {})
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  const result = await prerenderVoice({
    ...options(),
    forceTelemetry: false,
  })
  caches.add(result.cache)
  expect(result.telemetryDelivered).toBe(false)
  expect(await Bun.file(result.output).exists()).toBe(true)
  expect(requests).toHaveLength(2)
})
test('missing timings fail rather than silently generating unaligned audio', async () => {
  intercept()
  generated.timestamps = []
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  await expect(prerenderVoice(options())).rejects.toThrow('Recovery files')
  const parent = requests.flatMap(request => spans(request.body)).find(span => span.name === 'voice.prerender')!
  expect(parent.status.code).toBe(2)
  expect(await Bun.file(options().output).exists()).toBe(false)
})
test('does not resample lower-rate responses and masquerade them as 48 kHz', async () => {
  intercept()
  generated.sampleRate = 24_000
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  await expect(prerenderVoice(options())).rejects.toThrow('Recovery files')
  expect(await Bun.file(options().output).exists()).toBe(false)
})
test('synthesis errors are traced without leaking error messages or retrying', async () => {
  intercept()
  const generate = spyOn(GrokSpeaker.prototype, 'generate').mockRejectedValue(new Error('Secret echoed provider payload.'))
  await expect(prerenderVoice(options())).rejects.toThrow('Recovery files')
  expect(generate).toHaveBeenCalledTimes(1)
  const all = requests.flatMap(request => spans(request.body))
  expect(all.find(span => span.name === 'voice.prerender.synthesize')?.status.code).toBe(2)
  expect(JSON.stringify(requests)).not.toContain('Secret echoed provider payload')
})
test('validates input, output and endpoint before network access', async () => {
  const fetch = spyOn(globalThis, 'fetch')
  const generate = spyOn(GrokSpeaker.prototype, 'generate')
  await expect(prerenderVoice({
    ...options(),
    input: ' ',
  })).rejects.toThrow('nonempty')
  await expect(prerenderVoice({
    ...options(),
    input: 'a'.repeat(15_000),
  })).rejects.toThrow('characters')
  await expect(prerenderVoice({
    ...options(),
    output: path.resolve(root, 'voice.mp3'),
  })).rejects.toThrow('.opus')
  await expect(prerenderVoice({
    ...options(),
    telemetryEndpoint: 'file:///private',
  })).rejects.toThrow('HTTP(S)')
  await expect(prerenderVoice({
    ...options(),
    telemetryEndpoint: 'http://user:key@victoria.test/v1/traces',
  })).rejects.toThrow('embedded credentials')
  expect(fetch).not.toHaveBeenCalled()
  expect(generate).not.toHaveBeenCalled()
})
test('uses the configured endpoint and creates a private output when --output is omitted', async () => {
  const original = Bun.env.TELEMETRY_INGESTION_TRACES_ENDPOINT
  Bun.env.TELEMETRY_INGESTION_TRACES_ENDPOINT = 'http://configured.test/v1/traces'
  intercept()
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  try {
    const result = await prerenderVoice({
      input: 'Hi',
      key: 'xai-test',
    })
    caches.add(result.cache)
    outputs.add(result.output)
    expect(path.dirname(result.output)).toBe(path.dirname(result.cache))
    expect(path.basename(result.output)).toMatch(/^voice(?:_\d+)?\.opus$/u)
    expect(result.output).not.toContain('\\')
    expect(requests.every(request => request.url === 'http://configured.test/v1/traces')).toBe(true)
  } finally {
    if (original === undefined) {
      delete Bun.env.TELEMETRY_INGESTION_TRACES_ENDPOINT
    } else {
      Bun.env.TELEMETRY_INGESTION_TRACES_ENDPOINT = original
    }
  }
})
test('get-free preserves existing renders and reserves distinct names for concurrent runs', async () => {
  intercept()
  spyOn(GrokSpeaker.prototype, 'generate').mockResolvedValue(generated)
  await fs.writeFile(options().output, 'existing voice')
  const results = await Promise.all([prerenderVoice(options()), prerenderVoice(options())])
  for (const result of results) {
    caches.add(result.cache)
    expect(result.output).not.toContain('\\')
  }
  expect(new Set(results.map(result => path.basename(result.output)))).toEqual(new Set(['voice_2.opus', 'voice_3.opus']))
  expect(await Bun.file(options().output).text()).toBe('existing voice')
  const files = await fs.readdir(root)
  expect(files.toSorted()).toEqual(['voice.opus', 'voice_2.opus', 'voice_3.opus'])
})
