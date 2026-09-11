import type {SpeakOptions, SpeechEvent} from '../types.ts'

import {decodeBase64, decodeTimestamps} from '../audio.ts'
import Provider from './base/Provider.ts'

export default class Xai extends Provider {
  protected readonly endpoint = 'https://api.x.ai/v1/tts'
  readonly id = 'xai'
  private busy = false
  private connecting?: Promise<WebSocket>
  private socket?: WebSocket
  private socketTimestamps = true

  protected body(text: string, timestamps: boolean) {
    return {
      text,
      voice_id: this.settings.voice,
      ...this.synthesisOptions,
      with_timestamps: timestamps,
    }
  }

  override close() {
    super.close()
    this.disconnect()
  }

  async *stream(text: string, {signal: inputSignal, timestamps = true}: SpeakOptions): AsyncGenerator<SpeechEvent, void> {
    if (this.busy) {
      throw new Error('This GrokSpeaker already has an active stream. Finish or cancel it before starting another.')
    }
    this.busy = true
    const signal = this.signal(inputSignal)
    let socket: WebSocket | undefined
    const state = {
      completed: false,
      failed: false,
    }
    let cleanup: (() => void) | undefined
    try {
      signal.throwIfAborted()
      // Abort a connection wait without leaving a rejected promise unobserved.
      socket = await new Promise<WebSocket>((resolve, reject) => {
        const abort = () => reject(signal.reason)
        signal.addEventListener('abort', abort, {once: true})
        void this.connect(timestamps).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
      })
      signal.throwIfAborted()
      const activeSocket = socket
      const queue: Array<{event: SpeechEvent
        size: number}> = []
      let buffered = 0
      let remainder: Uint8Array = new Uint8Array
      let received = false
      let failure: unknown
      let wake = () => {}
      const fail = (reason: unknown) => {
        if (state.completed || state.failed) {
          return
        }
        state.failed = true
        failure = reason
        queue.length = 0
        wake()
        this.disconnect(activeSocket)
      }
      const push = (event: SpeechEvent, size: number) => {
        if (buffered + size > this.settings.maxBufferedBytes || queue.length >= 4096) {
          throw new Error('PCM stream consumer exceeded the buffer limit.')
        }
        queue.push({
          event,
          size,
        })
        buffered += size
        wake()
      }
      const message = ({data}: MessageEvent) => {
        if (state.completed || state.failed) {
          return
        }
        try {
          if (typeof data !== 'string') {
            throw new TypeError('Expected a JSON xAI TTS event.')
          }
          const parsed: unknown = JSON.parse(data)
          if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
            throw new Error('Invalid xAI TTS event.')
          }
          const event = parsed as Record<string, unknown>
          if (event.type === 'error') {
            // Provider messages can echo submitted text. Do not include them in exceptions.
            throw new Error('xAI TTS reported a synthesis error.')
          }
          if (event.type === 'audio.delta') {
            if (event.delta !== undefined) {
              const decoded = decodeBase64(event.delta)
              const bytes = remainder.length ? Buffer.concat([remainder, decoded]) : decoded
              const length = bytes.byteLength - bytes.byteLength % 2
              remainder = Uint8Array.from(bytes.subarray(length))
              if (length) {
                received = true
                push({
                  type: 'audio',
                  pcm: bytes.subarray(0, length),
                  sampleRate: 48_000,
                }, length)
              }
            }
            if (event.audio_timestamps !== undefined) {
              const times = decodeTimestamps(event.audio_timestamps)
              push({
                type: 'timestamps',
                timestamps: times,
              }, times.reduce((sum, time) => sum + time.char.length * 2 + 16, 0))
            }
          } else if (event.type === 'audio.done') {
            if (!received || remainder.length) {
              throw new Error('Empty or truncated 16-bit PCM stream.')
            }
            push({
              type: 'done',
              traceId: typeof event.trace_id === 'string' ? event.trace_id : undefined,
            }, 0)
            state.completed = true
          }
        } catch (error) {
          fail(error)
        }
      }
      const error = () => fail(new Error('xAI TTS socket closed before audio.done.'))
      const abort = () => fail(signal.reason)
      cleanup = () => {
        activeSocket.removeEventListener('message', message)
        activeSocket.removeEventListener('error', error)
        activeSocket.removeEventListener('close', error)
        signal.removeEventListener('abort', abort)
      }
      activeSocket.addEventListener('message', message)
      activeSocket.addEventListener('error', error)
      activeSocket.addEventListener('close', error)
      signal.addEventListener('abort', abort, {once: true})
      signal.throwIfAborted()
      activeSocket.send(JSON.stringify({
        type: 'text.delta',
        delta: text,
      }))
      activeSocket.send(JSON.stringify({type: 'text.done'}))
      while (true) {
        signal.throwIfAborted()
        if (state.failed) {
          throw failure
        }
        const item = queue.shift()
        if (item) {
          buffered -= item.size
          yield item.event
        } else if (state.completed) {
          break
        } else {
          await new Promise<void>(resolve => {
            wake = resolve
          })
        }
      }
    } finally {
      cleanup?.()
      if (!state.completed) {
        // Discard canceled sessions rather than risk old chunks leaking into the next utterance.
        this.disconnect(socket)
      }
      this.busy = false
    }
  }

  async warmup() {
    // A warmup during playback must not replace an active socket with different settings.
    if (this.busy) {
      this.lifetime.signal.throwIfAborted()
      await this.connecting
      return
    }
    await this.connect(true)
  }

  private async connect(timestamps: boolean): Promise<WebSocket> {
    this.lifetime.signal.throwIfAborted()
    if (this.connecting) {
      await this.connecting
    }
    this.lifetime.signal.throwIfAborted()
    if (this.socket?.readyState === WebSocket.OPEN && this.socketTimestamps === timestamps) {
      return this.socket
    }
    this.disconnect()
    this.socketTimestamps = timestamps
    const url = new URL('wss://api.x.ai/v1/tts')
    url.search = new URLSearchParams({
      voice: this.settings.voice,
      language: this.settings.language,
      codec: 'pcm',
      sample_rate: '48000',
      optimize_streaming_latency: '0',
      with_timestamps: String(timestamps),
      text_normalization: String(this.settings.textNormalization),
    }).toString()
    // lib.dom hides Bun’s server-side constructor overload when both type libraries are loaded.
    const Socket = WebSocket as unknown as new (url: URL, options: Bun.WebSocketOptions) => WebSocket
    const socket = new Socket(url, {headers: this.headers})
    this.socket = socket
    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = undefined
      }
    }, {once: true})
    const signal = this.signal()
    const connecting = new Promise<WebSocket>((resolve, reject) => {
      const listeners = new AbortController
      const fail = (reason: unknown) => {
        listeners.abort()
        this.disconnect(socket)
        reject(reason)
      }
      const error = () => fail(new Error('xAI TTS WebSocket connection failed.'))
      const abort = () => fail(signal.reason)
      const options = {
        once: true,
        signal: listeners.signal,
      }
      socket.addEventListener('open', () => {
        listeners.abort()
        resolve(socket)
      }, options)
      socket.addEventListener('error', error, options)
      socket.addEventListener('close', error, options)
      signal.addEventListener('abort', abort, options)
      if (signal.aborted) {
        abort()
      }
    })
    this.connecting = connecting
    try {
      return await connecting
    } finally {
      if (this.connecting === connecting) {
        this.connecting = undefined
      }
    }
  }

  private disconnect(socket = this.socket) {
    if (socket === this.socket) {
      this.socket = undefined
    }
    socket?.close()
  }
}
