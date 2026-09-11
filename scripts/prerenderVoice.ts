import type {GeneratedSpeech} from 'grok-speaker'

import {createHash} from 'node:crypto'
import {parseArgs} from 'node:util'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'
import getFree from 'get-free'
import GrokSpeaker, {serializeText} from 'grok-speaker'

import PrerenderTrace from './lib/voice/PrerenderTrace.ts'

export type PrerenderVoiceOptions = {
  forceTelemetry?: boolean
  input: string
  key?: string
  output?: string
  telemetryEndpoint?: string
}

const help = `Usage: bun scripts/prerenderVoice.ts --input <string> [--output <file.opus>] [--telemetry-endpoint <url>] [--force-telemetry | --no-force-telemetry]

Renders Iris through direct xAI: loud, Quality mode, 48 kHz PCM and character timings.
Encodes Opus at 80 kb/s VBR with compression level 10, without volume normalization.

--output                 Defaults to private/prerender-voice/voice.opus.
                         Existing names get a free numeric suffix; nothing is overwritten.
--telemetry-endpoint     Full OTLP/HTTP trace ingestion URL. Defaults to
                         TELEMETRY_INGESTION_TRACES_ENDPOINT or http://10.0.0.22:4318/v1/traces.
--force-telemetry        Enabled by default. Requires accepted OTLP preflight before TTS
                         and accepted final traces before publishing the Opus file.
--no-force-telemetry     Explicitly allow rendering when trace delivery fails.

Requires XAI_API_KEY, ffmpeg and ffprobe. Always retains lossless WAV, timings and
trace records under private/prerender-voice/<run-id>, including after delivery failure.
Never retries paid synthesis automatically. Ingestion acceptance is not a guarantee
of durable downstream storage or continued availability after the preflight.
`
const reserveOutput = async (requested: string) => {
  const {dir, name, ext} = path.parse(requested)
  await fs.ensureDir(dir)
  const free = await getFree(name, async candidate => {
    const output = path.join(dir, candidate + ext)
    if (await fs.pathExists(output)) {
      return true
    }
    const lock = `${output}.lock`
    try {
      // get-free finds names, while this exclusive reservation coordinates concurrent invocations.
      await fs.writeFile(lock, '', {flag: 'wx'})
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
        return true
      }
      throw error
    }
    if (await fs.pathExists(output)) {
      await fs.remove(lock)
      return true
    }
    return false
  })
  return path.join(dir, free + ext)
}

export function parsePrerenderVoiceArgs(args: Array<string>) {
  const {values} = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    allowNegative: true,
    options: {
      input: {type: 'string'},
      output: {type: 'string'},
      'telemetry-endpoint': {type: 'string'},
      'force-telemetry': {
        type: 'boolean',
        default: true,
      },
      help: {type: 'boolean'},
    },
  })
  if (values.help) {
    return
  }
  if (values.input === undefined) {
    throw new Error('--input is required.')
  }
  return {
    input: values.input,
    output: values.output,
    telemetryEndpoint: values['telemetry-endpoint'],
    forceTelemetry: values['force-telemetry'],
  }
}

/** Stage paid assets and require acknowledged telemetry before publishing to a reserved, unused output name. */
export default async function prerenderVoice({input, output, telemetryEndpoint = Bun.env.TELEMETRY_INGESTION_TRACES_ENDPOINT ?? 'http://10.0.0.22:4318/v1/traces', forceTelemetry = true, key = Bun.env.XAI_API_KEY ?? ''}: PrerenderVoiceOptions) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new TypeError('Input must be a nonempty string.')
  }
  if (typeof forceTelemetry !== 'boolean') {
    throw new TypeError('forceTelemetry must be a boolean.')
  }
  const segment = {
    text: input,
    modifier: 'loud' as const,
  }
  const text = serializeText(segment)
  const runId = crypto.randomUUID()
  const cache = path.resolve(import.meta.dir, '../private/prerender-voice', runId)
  const requested = path.resolve(output ?? path.resolve(path.dirname(cache), 'voice.opus'))
  if (path.extname(requested).toLowerCase() !== '.opus') {
    throw new Error('Output must have an .opus extension.')
  }
  if (!Bun.which('ffmpeg') || !Bun.which('ffprobe')) {
    throw new Error('ffmpeg and ffprobe are required.')
  }
  using speaker = new GrokSpeaker({
    key,
    provider: 'xai',
    voice: 'iris',
    language: 'en',
    textNormalization: false,
  })
  const trace = new PrerenderTrace(telemetryEndpoint, forceTelemetry, {
    'voice.run.id': runId,
    'voice.provider': 'xai',
    'voice.model': 'grok-voice-tts-1.0',
    'voice.id': 'iris',
    'voice.input': input,
    'voice.input.serialized': text,
    'voice.modifier': 'loud',
    'voice.quality': 0,
    'voice.text_normalization': false,
    'audio.sample_rate': 48_000,
    'audio.codec': 'opus',
    'audio.opus.bitrate': 80_000,
    'audio.opus.compression_level': 10,
    'output.requested.path': requested,
    'telemetry.required': forceTelemetry,
  })
  // A real, nonempty OTLP export checks status, JSON and partial rejection, not merely TCP reachability.
  const preflightDelivered = await trace.preflight()
  await fs.ensureDir(cache)
  const destination = await reserveOutput(requested)
  const temporary = `${destination}.${runId}.tmp`
  const tracePath = path.resolve(cache, 'trace.json')
  const timingsPath = path.resolve(cache, 'timings.json')
  const wave = path.resolve(cache, 'source.wav')
  const encoded = path.resolve(cache, 'encoded.opus')
  let finalExportStarted = false
  try {
    await fs.writeFile(temporary, '', {flag: 'wx'})
    await fs.writeJson(path.resolve(cache, 'request.json'), {
      text,
      provider: 'xai',
      voice: 'iris',
      sampleRate: 48_000,
      quality: 0,
      timestamps: true,
      normalization: false,
      traceId: trace.root.traceId,
    }, {spaces: 2})
    const synthesis = trace.startSpan('voice.prerender.synthesize')
    let audio: GeneratedSpeech
    try {
      audio = await speaker.generate(segment, {timestamps: true})
      // Keep the paid response even if validation, encoding or telemetry later fails.
      await Bun.write(wave, audio.wav)
      await fs.writeJson(timingsPath, audio.timestamps, {spaces: 2})
      await fs.writeJson(path.resolve(cache, 'response.json'), {
        sampleRate: audio.sampleRate,
        duration: audio.duration,
        providerTraceId: audio.traceId,
        timings: audio.timestamps.length,
      }, {spaces: 2})
      if (audio.sampleRate !== 48_000 || !audio.timestamps.length || !(audio.duration > 0) || !Number.isFinite(audio.duration)) {
        throw new Error('Expected 48 kHz speech with nonempty character timings.')
      }
      synthesis.end('ok', {
        'xai.trace.id': audio.traceId ?? '',
        'audio.duration': audio.duration,
        'voice.timings.count': audio.timestamps.length,
      })
    } catch (error) {
      synthesis.end('error', {'error.type': error instanceof Error ? error.name : typeof error})
      throw error
    }
    trace.timings(audio.timestamps)
    const encoding = trace.startSpan('voice.prerender.encode')
    try {
      await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${wave} -map 0:a:0 -map_metadata -1 -c:a libopus -b:a 80000 -vbr on -compression_level 10 -application audio ${encoded}`.quiet()
      const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration -of json ${encoded}`.json() as {format: {duration: string}
        streams: Array<{channels: number
          codec_name: string
          sample_rate: string}>}
      const stream = probe.streams[0]
      const duration = Number(probe.format.duration)
      if (!Number.isFinite(duration) || duration <= 0 || probe.streams.length !== 1 || stream.codec_name !== 'opus' || stream.sample_rate !== '48000' || stream.channels !== 1 || Math.abs(duration - audio.duration) > 0.02) {
        throw new Error('Encoded Opus does not match the source speech.')
      }
      encoding.end()
    } catch (error) {
      encoding.end('error', {'error.type': error instanceof Error ? error.name : typeof error})
      throw error
    }
    const bytes = await Bun.file(encoded).bytes()
    trace.root.end('ok', {
      'voice.stage': 'prepared',
      'output.path': destination,
      'voice.timings.count': audio.timestamps.length,
      'xai.trace.id': audio.traceId ?? '',
      'audio.duration': audio.duration,
      'audio.bytes': bytes.byteLength,
      'audio.sha256': createHash('sha256').update(bytes).digest('hex'),
      'telemetry.preflight.accepted': preflightDelivered,
    })
    await fs.writeJson(tracePath, trace.records, {spaces: 2})
    finalExportStarted = true
    const telemetryDelivered = await trace.send()
    await Bun.write(temporary, bytes)
    // Linking within the destination directory publishes atomically and refuses replacement.
    await fs.link(temporary, destination)
    return {
      output: destination,
      timingsPath,
      cache,
      traceId: trace.root.traceId,
      sampleRate: audio.sampleRate,
      duration: audio.duration,
      telemetryDelivered,
    }
  } catch (error) {
    trace.root.end('error', {'error.type': error instanceof Error ? error.name : typeof error})
    await fs.writeJson(tracePath, trace.records, {spaces: 2})
    // Do not resend partially accepted final batches. A retry would duplicate trace records.
    if (!finalExportStarted) {
      try {
        await trace.send()
      } catch {
        console.warn('Failed to deliver the error trace; its records were preserved locally.')
      }
    }
    throw new Error(`Voice prerender failed. Recovery files: ${cache}`, {cause: error})
  } finally {
    await fs.remove(temporary)
    await fs.remove(`${destination}.lock`)
  }
}

if (import.meta.main) {
  const options = parsePrerenderVoiceArgs(Bun.argv.slice(2))
  if (options) {
    console.log(JSON.stringify(await prerenderVoice(options), null, 2))
  } else {
    console.log(help)
  }
}
