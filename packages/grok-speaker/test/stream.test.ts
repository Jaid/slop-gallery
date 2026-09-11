import {afterEach, beforeEach, expect, test} from 'bun:test'

import GrokSpeaker from '../src/main.ts'
import FakeSocket from './FakeSocket.ts'

const nativeSocket = globalThis.WebSocket
const speakers: Array<GrokSpeaker> = []
const create = (options = {}) => {
  const speaker = new GrokSpeaker({
    key: 'xai-test',
    ...options,
  })
  speakers.push(speaker)
  return speaker
}
const tick = () => Bun.sleep(0)
beforeEach(() => {
  FakeSocket.instances = []
  FakeSocket.autoOpen = true
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket
})
afterEach(() => {
  for (const speaker of speakers.splice(0)) {
    speaker.close()
  }
  globalThis.WebSocket = nativeSocket
})
test('coalesces warmups without synthesizing and reuses the socket across utterances', async () => {
  const speaker = create()
  await Promise.all([speaker.warmup(), speaker.warmup(), speaker.warmup()])
  expect(FakeSocket.instances).toHaveLength(1)
  const socket = FakeSocket.instances[0]
  expect(socket.sent).toHaveLength(0)
  expect(socket.url.origin).toBe('wss://api.x.ai')
  expect(Object.fromEntries(socket.url.searchParams)).toEqual({
    voice: 'iris',
    language: 'en',
    codec: 'pcm',
    sample_rate: '48000',
    optimize_streaming_latency: '0',
    with_timestamps: 'true',
    text_normalization: 'false',
  })
  expect(socket.options.headers?.Authorization).toBe('Bearer xai-test')
  for (let index = 0; index < 2; index++) {
    const stream = speaker.stream({
      text: 'Hello.',
      modifier: 'loud',
    })
    const first = stream.next()
    await tick()
    expect(socket.sent.at(-2)).toEqual({
      type: 'text.delta',
      delta: '<loud>Hello.</loud>',
    })
    expect(socket.sent.at(-1)).toEqual({type: 'text.done'})
    socket.audio([1, 2, 3])
    const result1 = await first
    expect(result1.value).toEqual({
      type: 'audio',
      pcm: Buffer.from([1, 2]),
      sampleRate: 48_000,
    })
    socket.audio([4])
    const result2 = await stream.next()
    expect(result2.value).toEqual({
      type: 'audio',
      pcm: Buffer.from([3, 4]),
      sampleRate: 48_000,
    })
    // Alignment can arrive in an event without any audio delta.
    socket.emit({
      type: 'audio.delta',
      audio_timestamps: {
        graph_chars: ['H'],
        graph_times: [[0, 0.1]],
      },
    })
    const result3 = await stream.next()
    expect(result3.value).toEqual({
      type: 'timestamps',
      timestamps: [
        {
          char: 'H',
          start: 0,
          end: 0.1,
        },
      ],
    })
    socket.done()
    const result4 = await stream.next()
    expect(result4.value).toEqual({
      type: 'done',
      traceId: 'test-trace',
    })
    const result5 = await stream.next()
    expect(result5.done).toBe(true)
  }
  expect(FakeSocket.instances).toHaveLength(1)
  speaker.close()
  expect(socket.readyState).toBe(FakeSocket.CLOSED)
})
test('rejects overlapping streams without interrupting the first', async () => {
  const speaker = create()
  const stream = speaker.stream('First.')
  const pending = stream.next()
  await tick()
  await expect(speaker.stream('Second.').next()).rejects.toThrow('active stream')
  const socket = FakeSocket.instances[0]
  socket.audio()
  socket.done()
  await pending
  await Array.fromAsync(stream)
  expect(socket.sent).toHaveLength(2)
})
test('an early iterator return discards the session; later audio cannot leak', async () => {
  const speaker = create()
  const first = speaker.stream('First.')
  const pending = first.next()
  await tick()
  const oldSocket = FakeSocket.instances[0]
  oldSocket.audio()
  await pending
  await first.return()
  expect(oldSocket.readyState).toBe(FakeSocket.CLOSED)
  const second = speaker.stream('Second.')
  const next = second.next()
  await tick()
  const newSocket = FakeSocket.instances[1]
  oldSocket.audio([9, 9])
  newSocket.audio([5, 6])
  newSocket.done()
  const result6 = await next
  expect(result6.value).toEqual({
    type: 'audio',
    pcm: Buffer.from([5, 6]),
    sampleRate: 48_000,
  })
  await Array.fromAsync(second)
})
test('aborts a pending read immediately and can reconnect explicitly', async () => {
  const speaker = create()
  const controller = new AbortController
  const pending = speaker.stream('First.', {signal: controller.signal}).next()
  await tick()
  controller.abort(new Error('User canceled.'))
  await expect(pending).rejects.toThrow('User canceled')
  expect(FakeSocket.instances[0].readyState).toBe(FakeSocket.CLOSED)
  await speaker.warmup()
  expect(FakeSocket.instances).toHaveLength(2)
})
test('aborting before connection or during handshake never sends paid text', async () => {
  const speaker = create()
  await expect(speaker.stream('No.', {signal: AbortSignal.abort(new Error('Canceled.'))}).next()).rejects.toThrow('Canceled')
  expect(FakeSocket.instances).toHaveLength(0)
  FakeSocket.autoOpen = false
  const controller = new AbortController
  const pending = speaker.stream('No.', {signal: controller.signal}).next()
  controller.abort(new Error('Canceled.'))
  await expect(pending).rejects.toThrow('Canceled')
  expect(FakeSocket.instances[0].sent).toHaveLength(0)
  expect(FakeSocket.instances[0].readyState).toBe(FakeSocket.CLOSED)
})
test('reconnects an idle closed socket but never automatically replays an accepted utterance', async () => {
  const speaker = create()
  await speaker.warmup()
  FakeSocket.instances[0].close()
  const pending = speaker.stream('Once.').next()
  await tick()
  FakeSocket.instances[1].close()
  await expect(pending).rejects.toThrow('before audio.done')
  expect(FakeSocket.instances).toHaveLength(2)
  expect(FakeSocket.instances.flatMap(socket => socket.sent).filter(event => event.type === 'text.delta')).toHaveLength(1)
})
test('warmup does not replace an active timestamp-free stream', async () => {
  const speaker = create()
  const stream = speaker.stream('Hello.', {timestamps: false})
  const pending = stream.next()
  await speaker.warmup()
  await tick()
  const socket = FakeSocket.instances[0]
  expect(socket.url.searchParams.get('with_timestamps')).toBe('false')
  socket.audio()
  socket.done()
  await pending
  await Array.fromAsync(stream)
  expect(FakeSocket.instances).toHaveLength(1)
  await speaker.warmup()
  expect(FakeSocket.instances).toHaveLength(2)
})
test.each([
  {
    type: 'error',
    message: 'Do not expose submitted text.',
  },
  {
    type: 'audio.delta',
    delta: '%%%',
  },
  {
    type: 'audio.delta',
    audio_timestamps: {
      graph_chars: ['a'],
      graph_times: [],
    },
  },
  {type: 'audio.done'},
  null,
])('fails malformed or error events without retrying %j', async event => {
  const speaker = create()
  const pending = speaker.stream('Hello.').next()
  await tick()
  FakeSocket.instances[0].emit(event)
  await expect(pending).rejects.toThrow()
  expect(FakeSocket.instances).toHaveLength(1)
})
test('rejects truncated PCM and slow consumers exceeding the buffer limit', async () => {
  const speaker = create({maxBufferedBytes: 2})
  const pending = speaker.stream('Hello.').next()
  await tick()
  FakeSocket.instances[0].audio()
  await expect(pending).rejects.toThrow('buffer limit')
  const truncated = speaker.stream('Hello.').next()
  await tick()
  FakeSocket.instances[1].audio([1])
  FakeSocket.instances[1].done()
  await expect(truncated).rejects.toThrow('truncated')
})
test('bounds both handshake and synthesis time', async () => {
  const speaker = create({timeoutMs: 20})
  FakeSocket.autoOpen = false
  await expect(speaker.warmup()).rejects.toThrow()
  expect(FakeSocket.instances[0].readyState).toBe(FakeSocket.CLOSED)
  FakeSocket.autoOpen = true
  await expect(speaker.stream('Hello.').next()).rejects.toThrow()
  expect(FakeSocket.instances[1].readyState).toBe(FakeSocket.CLOSED)
})
test('close is idempotent, aborts active work and forbids reuse', async () => {
  const speaker = create()
  const pending = speaker.stream('Hello.').next()
  await tick()
  speaker.close()
  speaker.close()
  await expect(pending).rejects.toThrow('closed')
  await expect(speaker.warmup()).rejects.toThrow('closed')
  await expect(speaker.generate('Hello.')).rejects.toThrow('closed')
  await expect(speaker.stream('Hello.').next()).rejects.toThrow('closed')
})
test('closing coalesced warmups never opens a replacement connection', async () => {
  const speaker = create()
  FakeSocket.autoOpen = false
  const results = Promise.allSettled([speaker.warmup(), speaker.warmup()])
  speaker.close()
  expect(await results).toEqual([
    {
      status: 'rejected',
      reason: new Error('GrokSpeaker is closed.'),
    },
    {
      status: 'rejected',
      reason: new Error('GrokSpeaker is closed.'),
    },
  ])
  expect(FakeSocket.instances).toHaveLength(1)
  expect(FakeSocket.instances[0].readyState).toBe(FakeSocket.CLOSED)
})
