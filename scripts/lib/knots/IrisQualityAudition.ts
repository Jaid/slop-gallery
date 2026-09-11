import type {IrisTransport} from './irisQuality.ts'

import {createHash} from 'node:crypto'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import ExternalGenerator from '../../../src/lib/ai/ExternalGenerator.ts'
import pcmWave from '../../../src/lib/audio/pcmWave.ts'
import {decodeIrisQuality, irisQualityRequest} from './irisQuality.ts'
import {auditionTranscript} from './voiceAuditions.ts'

export default class IrisQualityAudition extends ExternalGenerator {
  constructor(private readonly output: string, private readonly transport: IrisTransport, private readonly apiKey: string, private readonly retryFailed = false) {
    // A direct xAI key must never be installed in the OpenRouter client.
    super(transport === 'openrouter' ? apiKey : '')
    this.headers['X-OpenRouter-Cache'] = 'false'
    delete this.headers['X-OpenRouter-Cache-TTL']
  }

  async run(normalization = false) {
    const id = `${this.transport}-loud-quality${normalization ? '-normalized' : ''}`
    const directory = resolve(this.output, id)
    const clips = []
    let offset = 0
    for (const [index, text] of auditionTranscript.entries()) {
      const request = irisQualityRequest(this.transport, text, normalization)
      const hash = createHash('sha256').update(JSON.stringify(request)).digest('hex')
      const cache = resolve(directory, 'clips', `${index + 1}-${hash}`)
      await fs.ensureDir(cache)
      const reservation = resolve(cache, 'request.json')
      const responseFile = resolve(cache, 'response.bin')
      const receiptFile = resolve(cache, 'response.json')
      if (!await fs.pathExists(responseFile)) {
        if (!this.apiKey) {
          throw new Error(`Missing ${this.transport === 'xai' ? 'XAI_API_KEY' : 'OPENROUTER_API_KEY'}.`)
        }
        if (this.retryFailed && await fs.pathExists(reservation)) {
          await fs.move(reservation, resolve(cache, `request-${crypto.randomUUID()}.json`))
        }
        await fs.writeJson(reservation, {
          request,
          startedAt: (new Date).toISOString(),
        }, {
          spaces: 2,
          flag: 'wx',
        })
        const init = {
          method: 'POST',
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(90_000),
        }
        const response = this.transport === 'openrouter' ? await this.request('audio/speech', init) : await fetch('https://api.x.ai/v1/tts', {
          ...init,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        const bytes = new Uint8Array(await response.arrayBuffer())
        const receipt = {
          status: response.status,
          contentType: response.headers.get('content-type'),
          generationId: response.headers.get('x-generation-id'),
          traceId: response.headers.get('x-trace-id'),
          sha256: createHash('sha256').update(bytes).digest('hex'),
        }
        if (!response.ok) {
          await Bun.write(resolve(cache, `error-${crypto.randomUUID()}.bin`), bytes)
          throw new Error(`Speech request failed (${response.status}). The failed response was preserved.`)
        }
        await fs.writeJson(receiptFile, receipt, {spaces: 2})
        await Bun.write(responseFile, bytes)
      }
      const bytes = await Bun.file(responseFile).bytes()
      const receipt = await fs.readJson(receiptFile) as {contentType: string | null
        generationId: string | null
        sha256: string
        traceId: string | null}
      if (createHash('sha256').update(bytes).digest('hex') !== receipt.sha256) {
        throw new Error(`Cached response changed: ${cache}`)
      }
      const decoded = decodeIrisQuality(bytes)
      if (decoded.duration > 15) {
        throw new Error(`Suspiciously long single-name recording: ${text}`)
      }
      const source = resolve(cache, 'source.wav')
      const pcm = Uint8Array.from(decoded.pcm).buffer
      await Bun.write(resolve(cache, 'source.pcm'), pcm)
      await Bun.write(source, pcmWave(pcm, decoded.sampleRate))
      const {pcm: _, ...details} = decoded
      const clip = {
        text,
        request,
        ...receipt,
        ...details,
        source,
        offset,
      }
      await fs.writeJson(resolve(cache, 'clip.json'), clip, {spaces: 2})
      clips.push(clip)
      offset += decoded.duration + 0.5
    }
    const rates = new Set(clips.map(clip => clip.sampleRate))
    if (rates.size !== 1) {
      throw new Error('The five clips have different sample rates; refusing silent resampling.')
    }
    const sampleRate = clips[0].sampleRate
    const gap = resolve(directory, 'gap.wav')
    await Bun.write(gap, pcmWave(new ArrayBuffer(sampleRate), sampleRate))
    const paths = clips.flatMap((clip, index) => {
      return index ? [gap, clip.source] : [clip.source]
    })
    const concat = resolve(directory, 'concat.txt')
    await fs.writeFile(concat, paths.map(path => `file '${path.replaceAll('\\', '/').replaceAll("'", String.raw`'\''`)}'`).join('\n'))
    const wave = resolve(directory, 'review.wav')
    const opus = resolve(this.output, `${id}.opus`)
    const temporary = resolve(directory, 'review.opus')
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i ${concat} -map 0:a:0 -map_metadata -1 -c:a copy ${wave}`
    // Maximum mono Opus bitrate for review. Preserve the native PCM/WAV masters separately.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${wave} -map 0:a:0 -map_metadata -1 -c:a libopus -b:a 256000 -vbr on -compression_level 10 -application audio ${temporary}`
    const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name:format=duration -of json ${temporary}`.json() as {format: {duration: string}
      streams: Array<{codec_name: string}>}
    if (probe.streams[0]?.codec_name !== 'opus' || Math.abs(Number(probe.format.duration) - (offset - 0.5)) > 0.02) {
      throw new Error('Review audio does not match its five sources.')
    }
    await fs.move(temporary, opus, {overwrite: true})
    const manifest = {
      id,
      transport: this.transport,
      normalization,
      sampleRate,
      duration: offset - 0.5,
      opus,
      wave,
      clips,
    }
    await fs.writeJson(resolve(directory, 'manifest.json'), manifest, {spaces: 2})
    await fs.writeJson(resolve(directory, 'timestamps.json'), clips.flatMap(clip => clip.timestamps.map(time => ({
      clip: clip.text,
      ...time,
      start: time.start + clip.offset,
      end: time.end + clip.offset,
    }))), {spaces: 2})
    return manifest
  }
}
