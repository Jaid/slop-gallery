export type IrisLatencyTurn = {
  doneMs: number
  events: Array<{event: Event
    ms: number}>
  firstAudioMs: number
  firstPlayableMs: number
  firstTimestampMs: number | null
  handshakeMs: number
  text: string
  warm: boolean
}

type Event = {
  audio_duration?: number
  audio_timestamps?: unknown
  delta?: string
  message?: string
  trace_id?: string
  type: string
}

/** Real network measurements only: never play audio or interact with the user’s browser. */
export default async function measureIrisLatency(text: string, timestamps: boolean, key: string) {
  const url = new URL('wss://api.x.ai/v1/tts')
  url.search = new URLSearchParams({
    voice: 'iris',
    language: 'en',
    codec: 'pcm',
    sample_rate: '48000',
    optimize_streaming_latency: '0',
    with_timestamps: String(timestamps),
    text_normalization: 'false',
  }).toString()
  const started = performance.now()
  // The project’s DOM types hide Bun’s native header-enabled constructor overload.
  const Socket = WebSocket as unknown as new (url: URL, options: Bun.WebSocketOptions) => WebSocket
  const socket = new Socket(url, {headers: {Authorization: `Bearer ${key}`}})
  const turns: Array<IrisLatencyTurn> = []
  let handshake = 0
  let sent = 0
  let received = 0
  let firstAudio: number | undefined
  let firstPlayable: number | undefined
  let firstTimestamp: number | null = null
  let events: IrisLatencyTurn['events'] = []
  return new Promise<Array<IrisLatencyTurn>>((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      settled = true
      socket.close()
      reject(new Error('Iris latency measurement timed out.'))
    }, 30_000)
    const finish = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      socket.close()
      if (error) {
        reject(error)
      } else {
        resolve(turns)
      }
    }
    const send = () => {
      sent = performance.now()
      received = 0
      firstAudio = undefined
      firstPlayable = undefined
      firstTimestamp = null
      events = []
      socket.send(JSON.stringify({
        type: 'text.delta',
        delta: `<loud>${text}</loud>`,
      }))
      socket.send(JSON.stringify({type: 'text.done'}))
    }
    socket.addEventListener('open', () => {
      handshake = performance.now() - started
      send()
    })
    socket.addEventListener('error', () => finish(new Error('Iris WebSocket failed.')))
    socket.addEventListener('close', () => {
      if (!settled) {
        finish(new Error('Iris WebSocket closed before audio.done.'))
      }
    })
    socket.addEventListener('message', message => {
      if (settled) {
        return
      }
      try {
        const ms = performance.now() - sent
        const event = JSON.parse(String(message.data)) as Event
        events.push({
          ms,
          event,
        })
        if (event.type === 'error') {
          finish(new Error(event.message ?? 'Iris returned an error.'))
        } else if (event.type === 'audio.delta') {
          if (event.delta) {
            const bytes = Buffer.from(event.delta, 'base64').byteLength
            received += bytes
            if (bytes) {
              firstAudio ??= ms
            }
            // Enough 48 kHz, mono 16-bit PCM for a 20 ms initial playback buffer.
            if (received >= 1920) {
              firstPlayable ??= ms
            }
          }
          if (event.audio_timestamps) {
            firstTimestamp ??= ms
          }
        } else if (event.type === 'audio.done') {
          if (firstAudio === undefined || firstPlayable === undefined) {
            finish(new Error('Iris returned no playable audio.'))
            return
          }
          turns.push({
            text,
            warm: turns.length > 0,
            handshakeMs: handshake,
            firstAudioMs: firstAudio,
            firstPlayableMs: firstPlayable,
            firstTimestampMs: firstTimestamp,
            doneMs: ms,
            events,
          })
          if (turns.length === 2) {
            finish()
          } else {
            send()
          }
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)))
      }
    })
  })
}
