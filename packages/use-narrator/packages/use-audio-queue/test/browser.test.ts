import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {audioFile} from '../src/browser.ts'
import {AudioQueue} from '../src/core.ts'
import {flush} from './helpers.ts'

class Media extends EventTarget {
  static instances: Array<Media> = []
  currentTime = 0
  ended = false
  loads = 0
  paused = true
  pauses = 0
  preload = ''
  removals = 0
  starts = 0
  volume = 1
  constructor(readonly src: string) {
    super(); Media.instances.push(this)
  }
  end() {
    this.ended = true; this.dispatchEvent(new Event('ended'))
  }
  load() {
    this.loads++
  }
  pause() {
    this.pauses++; this.paused = true
  }
  async play() {
    this.starts++; this.paused = false
  }
  removeAttribute() {
    this.removals++
  }
}
const original = globalThis.Audio
let queue: AudioQueue
beforeEach(() => {
  Media.instances = []
  Object.assign(globalThis, {Audio: Media})
  queue = new AudioQueue
})
afterEach(() => {
  queue.dispose(); Object.assign(globalThis, {Audio: original})
})
test('local audio waits for ended, releases its connection and unloads exactly once', async () => {
  let disconnected = 0
  const handle = queue.push(audioFile('/voice.opus', {
    volume: 0.85,
    connect: () => () => {
      disconnected++
    },
  }))
  await flush()
  const audio = Media.instances[0]
  expect(audio.volume).toBe(0.85)
  expect(audio.starts).toBe(1)
  expect(queue.getSnapshot().idle).toBe(false)
  audio.end()
  expect(await handle.finished).toEqual({status: 'completed'})
  expect(disconnected).toBe(1)
  expect(audio.removals).toBe(1)
  expect(audio.loads).toBe(1)
  queue.dispose()
  expect(disconnected).toBe(1)
})
test('cancellation while a shared context resumes never creates or connects stale media', async () => {
  const resumed = Promise.withResolvers<void>()
  let connections = 0
  const handle = queue.push(audioFile('/voice.opus', {
    prepare: () => resumed.promise,
    connect: () => {
      connections++; return () => {}
    },
  }))
  await flush()
  handle.cancel()
  resumed.resolve()
  await flush()
  expect((await handle.finished).status).toBe('cancelled')
  expect(Media.instances).toHaveLength(0)
  expect(connections).toBe(0)
})
test('injection pauses/resumes the same media element at its preserved playback position', async () => {
  queue.push(audioFile('/original.opus'))
  await flush()
  const original = Media.instances[0]
  original.currentTime = 4.25
  queue.push(audioFile('/insert.opus'), {priority: 'inject'})
  await flush()
  expect(original.paused).toBe(true)
  expect(original.removals).toBe(0)
  Media.instances[1].end()
  await flush()
  expect(Media.instances).toHaveLength(2)
  expect(original.currentTime).toBe(4.25)
  expect(original.starts).toBe(2)
  expect(original.paused).toBe(false)
})
test('Blob URLs are owned and revoked, while caller-owned URLs are preserved', async () => {
  const create = spyOn(URL, 'createObjectURL').mockReturnValue('blob:owned')
  const revoke = spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  try {
    const first = queue.push(audioFile(new Blob(['audio'])))
    await flush()
    expect(Media.instances[0].src).toBe('blob:owned')
    first.cancel()
    expect(revoke).toHaveBeenCalledTimes(1)
    queue.push(audioFile('blob:caller'))
    await flush()
    queue.clear()
    expect(revoke).toHaveBeenCalledTimes(1)
  } finally {
    create.mockRestore(); revoke.mockRestore()
  }
})
test('a media error and rejected start settle once and advance to the next recording', async () => {
  let disconnected = 0
  const play = spyOn(Media.prototype, 'play').mockImplementationOnce(async function (this: Media) {
    this.dispatchEvent(new Event('error'))
    throw new Error('play rejected')
  })
  try {
    const broken = queue.push(audioFile('/broken.opus', {connect: () => () => {
      disconnected++
    }}))
    const next = queue.push(audioFile('/next.opus'))
    await flush()
    expect((await broken.finished).status).toBe('failed')
    expect(disconnected).toBe(1)
    expect(queue.getSnapshot().current?.id).toBe(next.id)
  } finally {
    play.mockRestore()
  }
})
test('a late resolved play cannot restart media that was cancelled', async () => {
  const start = Promise.withResolvers<void>()
  const play = spyOn(Media.prototype, 'play').mockImplementationOnce(async function (this: Media) {
    await start.promise
    this.paused = false
  })
  try {
    const handle = queue.push(audioFile('/voice.opus'))
    await flush()
    handle.cancel()
    start.resolve()
    await flush()
    expect(Media.instances[0].paused).toBe(true)
    expect(queue.getSnapshot().idle).toBe(true)
  } finally {
    play.mockRestore()
  }
})
test('a stale first start cannot pause media that has already resumed after injection', async () => {
  const firstStart = Promise.withResolvers<void>()
  const play = spyOn(Media.prototype, 'play').mockImplementationOnce(async function (this: Media) {
    await firstStart.promise
    this.paused = false
  })
  try {
    queue.push(audioFile('/original.opus'))
    await flush()
    const original = Media.instances[0]
    queue.push(audioFile('/insert.opus'), {priority: 'inject'})
    await flush()
    expect(original.paused).toBe(true)
    Media.instances[1].end()
    await flush()
    expect(original.paused).toBe(false)
    firstStart.resolve()
    await flush()
    expect(original.paused).toBe(false)
  } finally {
    play.mockRestore()
  }
})
test('failure while connecting audio releases a generated URL', async () => {
  const create = spyOn(URL, 'createObjectURL').mockReturnValue('blob:owned')
  const revoke = spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  try {
    const handle = queue.push(audioFile(new Blob(['audio']), {connect: () => {
      throw new Error('connect failed')
    }}))
    expect((await handle.finished).status).toBe('failed')
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(Media.instances[0].loads).toBe(1)
  } finally {
    create.mockRestore(); revoke.mockRestore()
  }
})
