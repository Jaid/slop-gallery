import {expect, test} from 'bun:test'

import {flush} from '../packages/use-audio-queue/test/helpers.ts'
import {SpeechCache} from '../src/core.ts'

const signal = () => (new AbortController).signal
test('shared generation has independently cancellable consumers', async () => {
  const ready = Promise.withResolvers<string>()
  let calls = 0
  let providerSignal: AbortSignal | undefined
  const cache = new SpeechCache((_speech, active) => {
    calls++; providerSignal = active; return ready.promise
  })
  const first = new AbortController
  const second = new AbortController
  const a = cache.synthesize({text: 'Same'}, first.signal)
  const b = cache.synthesize({text: 'Same'}, second.signal)
  void a.catch(() => {})
  await flush()
  first.abort('first left')
  await expect(a).rejects.toBe('first left')
  expect(calls).toBe(1)
  expect(providerSignal!.aborted).toBe(false)
  ready.resolve('/cached.opus')
  expect(await b).toBe('/cached.opus')
  expect(await cache.synthesize({text: 'Same'}, signal())).toBe('/cached.opus')
  expect(calls).toBe(1)
  cache.dispose()
})
test('the last consumer leaving aborts generation and a late result is not cached', async () => {
  const ready = Promise.withResolvers<string>()
  let calls = 0
  let providerSignal: AbortSignal | undefined
  const cache = new SpeechCache((_speech, active) => {
    calls++; providerSignal = active; return calls === 1 ? ready.promise : '/fresh.opus'
  })
  const controller = new AbortController
  const first = cache.synthesize({text: 'Hello'}, controller.signal)
  void first.catch(() => {})
  await flush()
  controller.abort('gone')
  await expect(first).rejects.toBe('gone')
  expect(providerSignal!.aborted).toBe(true)
  ready.resolve('/stale.opus')
  await flush()
  expect(await cache.synthesize({text: 'Hello'}, signal())).toBe('/fresh.opus')
  expect(calls).toBe(2)
  cache.dispose()
})
test('dispose releases consumers even when the provider ignores its cancellation signal', async () => {
  const never = Promise.withResolvers<string>()
  const cache = new SpeechCache(() => never.promise)
  const pending = cache.synthesize({text: 'Hello'}, signal())
  void pending.catch(() => {})
  await flush()
  cache.dispose()
  await expect(pending).rejects.toBeDefined()
  await expect(cache.synthesize({text: 'Hello'}, signal())).rejects.toThrow('disposed')
})
test('cache is bounded LRU and separates voice/rate choices', async () => {
  let calls = 0
  const cache = new SpeechCache(() => `/generated-${++calls}.opus`, 2)
  await cache.synthesize({text: 'a'}, signal())
  await cache.synthesize({text: 'b'}, signal())
  await cache.synthesize({text: 'a'}, signal())
  await cache.synthesize({text: 'c'}, signal())
  expect(calls).toBe(3)
  await cache.synthesize({text: 'a'}, signal())
  expect(calls).toBe(3)
  await cache.synthesize({text: 'b'}, signal())
  await cache.synthesize({
    text: 'b',
    rate: 0.9,
  }, signal())
  await cache.synthesize({
    text: 'b',
    rate: 0.9,
    voice: 'other',
  }, signal())
  expect(calls).toBe(6)
  cache.dispose()
})
test('failed generation is not cached and invalid capacities are rejected', async () => {
  let calls = 0
  const cache = new SpeechCache(() => {
    if (++calls === 1) {
      throw new Error('failed')
    }; return '/success.opus'
  })
  await expect(cache.synthesize({text: 'Hello'}, signal())).rejects.toThrow('failed')
  expect(await cache.synthesize({text: 'Hello'}, signal())).toBe('/success.opus')
  expect(calls).toBe(2)
  for (const capacity of [0, -1, 0.5, Infinity]) {
    expect(() => new SpeechCache(() => '', capacity)).toThrow(RangeError)
  }
  cache.dispose()
})
