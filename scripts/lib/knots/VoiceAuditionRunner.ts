import type {VoiceAudition} from './voiceAuditions.ts'

import {createHash} from 'node:crypto'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import ExternalGenerator from '../../../src/lib/ai/ExternalGenerator.ts'
import pcmWave from '../../../src/lib/audio/pcmWave.ts'
import {auditionRequest, auditionTranscript} from './voiceAuditions.ts'

type Clip = {
  duration: number
  generationId: string | null
  request: ReturnType<typeof auditionRequest>
  sha256: string
  source: string
  text: string
}

/** Every clip has its own stateless, uncached upstream request and durable provenance. */
export default class VoiceAuditionRunner extends ExternalGenerator {
  constructor(private readonly output: string, private readonly apiKey?: string, private readonly retryFailed = false) {
    super(apiKey ?? '')
    this.headers['X-OpenRouter-Cache'] = 'false'
    delete this.headers['X-OpenRouter-Cache-TTL']
  }

  async run(candidate: VoiceAudition) {
    const directory = resolve(this.output, candidate.id)
    const clips: Array<Clip> = []
    for (const [index, text] of auditionTranscript.entries()) {
      const request = auditionRequest(candidate, text)
      const hash = createHash('sha256').update(JSON.stringify(request)).digest('hex')
      const cache = resolve(directory, 'clips', `${index + 1}-${hash}`)
      const source = resolve(cache, 'source.wav')
      const receipt = resolve(cache, 'clip.json')
      await fs.ensureDir(cache)
      if (!await fs.pathExists(receipt)) {
        if (!this.apiKey) {
          throw new Error('OPENROUTER_API_KEY is missing.')
        }
        const reservation = resolve(cache, 'request.json')
        if (await fs.pathExists(reservation) && this.retryFailed) {
          // Preserve the unsuccessful attempt rather than erasing its evidence.
          await fs.move(reservation, resolve(cache, `request-${crypto.randomUUID()}.json`))
        }
        await fs.writeJson(reservation, {
          request,
          startedAt: (new Date).toISOString(),
        }, {
          flag: 'wx',
          spaces: 2,
        })
        try {
          const response = await this.request('audio/speech', {
            method: 'POST',
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(90_000),
          })
          const generationId = response.headers.get('x-generation-id')
          await fs.writeJson(resolve(cache, 'response.json'), {
            generationId,
            status: response.status,
            contentType: response.headers.get('content-type'),
            provider: response.headers.get('x-provider-name'),
          }, {spaces: 2})
          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Speech request failed (${response.status}): ${error.slice(0, 2000)}`)
          }
          const type = response.headers.get('content-type') ?? ''
          const rate = /(?:^|;)\s*rate=(\d+)/iu.exec(type)?.[1]
          const channels = /(?:^|;)\s*channels=(\d+)/iu.exec(type)?.[1]
          if (rate && Number(rate) !== 24_000 || channels && Number(channels) !== 1) {
            throw new Error(`Expected mono 24 kHz audio, received ${type}.`)
          }
          const bytes = await response.arrayBuffer()
          if (!bytes.byteLength || bytes.byteLength > 4_000_000) {
            throw new Error('Invalid speech payload length.')
          }
          if (/^audio\/(?:l16|pcm)(?:;|$)/iu.test(type)) {
            await Bun.write(source, pcmWave(bytes, 24_000))
          } else if (/^audio\/(?:wav|x-wav)(?:;|$)/iu.test(type)) {
            await Bun.write(source, bytes)
          } else {
            throw new Error(`Expected lossless audio, received ${type}.`)
          }
          const duration = await this.duration(source)
          if (!(duration > 0 && duration <= 15)) {
            throw new Error(`Unexpected single-name duration: ${duration}`)
          }
          const clip: Clip = {
            text,
            source: source.replaceAll('\\', '/'),
            duration,
            request,
            generationId,
            sha256: createHash('sha256').update(await Bun.file(source).bytes()).digest('hex'),
          }
          await fs.writeJson(receipt, clip, {spaces: 2})
        } catch (error) {
          await fs.writeJson(resolve(cache, `error-${crypto.randomUUID()}.json`), {message: String(error)}, {spaces: 2})
          throw error
        }
      }
      const clip = await fs.readJson(receipt) as Clip
      const hashOfSource = createHash('sha256').update(await Bun.file(source).bytes()).digest('hex')
      if (clip.sha256 !== hashOfSource) {
        throw new Error(`Cached audio changed: ${source}`)
      }
      clips.push(clip)
    }
    const gapSeconds = 0.5
    const gap = resolve(directory, 'gap.wav')
    await Bun.write(gap, pcmWave(new ArrayBuffer(24_000 * 2 * gapSeconds)))
    const paths: Array<string> = []
    for (const [index, clip] of clips.entries()) {
      if (index) {
        paths.push(gap)
      }
      paths.push(clip.source)
    }
    const concat = resolve(directory, 'concat.txt')
    await fs.writeFile(concat, paths.map(path => `file '${path.replaceAll('\\', '/').replaceAll("'", String.raw`'\''`)}'`).join('\n'))
    const file = resolve(this.output, `${candidate.id}.opus`)
    const temporary = resolve(directory, 'audition.opus')
    // Concatenate lossless independent recordings; no crossfade, gain/pitch correction or Opus re-encoding.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i ${concat} -map 0:a:0 -map_metadata -1 -ar 24000 -ac 1 -c:a libopus -b:a 80000 -vbr on -compression_level 10 -application audio ${temporary}`
    const duration = await this.duration(temporary)
    const expected = clips.reduce((sum, clip) => sum + clip.duration, 0) + gapSeconds * (clips.length - 1)
    if (Math.abs(duration - expected) > 0.1) {
      throw new Error('Stitched audio duration does not match its five sources.')
    }
    await fs.move(temporary, file, {overwrite: true})
    const manifest = {
      ...candidate,
      file: file.replaceAll('\\', '/'),
      duration,
      gapSeconds,
      clips,
    }
    await fs.writeJson(resolve(directory, 'manifest.json'), manifest, {spaces: 2})
    return manifest
  }

  private async duration(file: string) {
    const probe = await Bun.$`ffprobe -v error -show_entries format=duration -of json ${file}`.json() as {format: {duration: string}}
    return Number(probe.format.duration)
  }
}
