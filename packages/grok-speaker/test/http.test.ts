import {afterEach, expect, mock, spyOn, test} from 'bun:test'

import GrokSpeaker from '../src/main.ts'

type RecordedBody = Record<string, unknown> & {
  provider: {options: {xai: Record<string, unknown>}}
}
const readBody = (request?: RequestInit): RecordedBody => {
  if (typeof request?.body !== 'string') {
    throw new TypeError('Expected a JSON request body.')
  }
  return JSON.parse(request.body) as RecordedBody
}
afterEach(() => mock.restore())
test('warms OpenRouter HTTP without a synthesis request or returning account data', async () => {
  const response = Response.json({data: {usage: 123}})
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(response)
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  expect(await speaker.warmup()).toBeUndefined()
  const [url, request] = fetchMock.mock.calls[0]
  expect(url).toBe('https://openrouter.ai/api/v1/key')
  expect(request?.body).toBeUndefined()
  expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer sk-or-test')
  expect(request?.redirect).toBe('error')
  expect(response.bodyUsed).toBe(true)
})
test('warmup rejects authentication failures and closed speakers', async () => {
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized.', {status: 401}))
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  await expect(speaker.warmup()).rejects.toThrow('HTTP 401')
  speaker.close()
  await expect(speaker.warmup()).rejects.toThrow('closed')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
test.each([[], [1]])('rejects empty or truncated OpenRouter PCM %j', async (...bytes: Array<number>) => {
  spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array(bytes), {headers: {'content-type': 'audio/pcm;rate=24000'}}))
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  await expect(Array.fromAsync(speaker.stream('Hello.'))).rejects.toThrow('Empty or truncated')
})
test('cancels unexpected HTTP bodies instead of retaining the connection', async () => {
  const cancel = mock(() => {})
  const body = new ReadableStream<Uint8Array>({cancel})
  spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {headers: {'content-type': 'audio/mpeg'}}))
  using speaker = new GrokSpeaker({key: 'xai-test'})
  await expect(speaker.generate('Hello.', {timestamps: false})).rejects.toThrow('raw PCM')
  expect(cancel).toHaveBeenCalledTimes(1)
})
test.each([['xai-test', 'https://api.x.ai/v1/tts', 48_000], ['sk-or-test', 'https://openrouter.ai/api/v1/audio/speech', 24_000]] as const)('generates truthful WAV and timestamps with %s', async (key, url, rate) => {
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    audio: Buffer.alloc(rate * 2).toString('base64'),
    duration: 1,
    content_type: 'audio/pcm',
    audio_timestamps: {
      graph_chars: ['H'],
      graph_times: [[0, 1]],
    },
  }, {
    headers: {
      'content-type': `audio/pcm;rate=${rate};channels=1`,
      'x-trace-id': 'trace',
      'x-generation-id': 'trace',
    },
  }))
  using speaker = new GrokSpeaker({key})
  const result = await speaker.generate({
    text: 'Hello.',
    modifier: 'loud',
  })
  expect(result.sampleRate).toBe(rate)
  expect(result.wav.byteLength).toBe(44 + rate * 2)
  expect(result.timestamps).toEqual([
    {
      char: 'H',
      start: 0,
      end: 1,
    },
  ])
  expect(result.traceId).toBe('trace')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [endpoint, request] = fetchMock.mock.calls[0]
  expect(endpoint).toBe(url)
  expect(request?.redirect).toBe('error')
  expect(new Headers(request?.headers).get('Authorization')).toBe(`Bearer ${key}`)
  const body = readBody(request)
  const options = speaker.provider === 'xai' ? body : body.provider.options.xai
  expect(options.output_format).toEqual({
    codec: 'pcm',
    sample_rate: 48_000,
  })
  expect(options.optimize_streaming_latency).toBe(0)
  expect(options.with_timestamps).toBe(true)
  expect(options.text_normalization).toBe(false)
  expect(speaker.provider === 'xai' ? body.text : body.input).toBe('<loud>Hello.</loud>')
})
test('generates without timestamps by wrapping raw PCM', async () => {
  spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2]), {headers: {'content-type': 'audio/pcm'}}))
  using speaker = new GrokSpeaker({key: 'xai-test'})
  const result = await speaker.generate('Hello.', {timestamps: false})
  expect(result.sampleRate).toBe(48_000)
  expect(result.wav.subarray(44)).toEqual(new Uint8Array([1, 2]))
  expect(result.timestamps).toEqual([])
})
test('streams OpenRouter PCM as bytes arrive, even across odd byte boundaries', async () => {
  let control!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      control = controller
    },
  })
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {
    headers: {
      'content-type': 'audio/pcm;rate=24000;channels=1',
      'x-generation-id': 'id',
    },
  }))
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  const stream = speaker.stream('Hello.')
  const pending = stream.next()
  control.enqueue(new Uint8Array([1, 2, 3]))
  const result1 = await pending
  expect(result1.value).toEqual({
    type: 'audio',
    pcm: new Uint8Array([1, 2]),
    sampleRate: 24_000,
  })
  control.enqueue(new Uint8Array([4]))
  const result2 = await stream.next()
  expect(result2.value).toEqual({
    type: 'audio',
    pcm: Buffer.from([3, 4]),
    sampleRate: 24_000,
  })
  control.close()
  const result3 = await stream.next()
  expect(result3.value).toEqual({
    type: 'done',
    traceId: 'id',
  })
  const result4 = await stream.next()
  expect(result4.done).toBe(true)
  expect(readBody(fetchMock.mock.calls[0][1]).provider.options.xai.with_timestamps).toBe(false)
})
test('OpenRouter stream cancellation cancels the body and aborts the request', async () => {
  const cancel = mock(() => {})
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]))
    },
    cancel,
  })
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {headers: {'content-type': 'audio/pcm;rate=24000'}}))
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  const stream = speaker.stream('Hello.')
  await stream.next()
  await stream.return()
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
})
test('does not buffer a supposedly live OpenRouter stream for timestamps', async () => {
  const fetchMock = spyOn(globalThis, 'fetch')
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  await expect(speaker.stream('Hello.', {timestamps: true}).next()).rejects.toThrow('buffered generation')
  expect(fetchMock).not.toHaveBeenCalled()
})
test.each([401, 429, 500])('does not retry HTTP %s or expose the response body', async status => {
  const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Secret echoed input.', {status}))
  using speaker = new GrokSpeaker({key: 'xai-test'})
  await expect(speaker.generate('Hello.')).rejects.toThrow(`xai speech request failed (HTTP ${status}).`)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
test('pre-aborted requests do not send text', async () => {
  const fetchMock = spyOn(globalThis, 'fetch')
  using speaker = new GrokSpeaker({key: 'sk-or-test'})
  const signal = AbortSignal.abort(new Error('Canceled.'))
  await expect(speaker.generate('Hello.', {signal})).rejects.toThrow('Canceled')
  await expect(speaker.stream('Hello.', {signal}).next()).rejects.toThrow('Canceled')
  expect(fetchMock).not.toHaveBeenCalled()
})
