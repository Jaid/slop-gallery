import {createHash} from 'node:crypto'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import NarrationGenerator from '../src/lib/ai/NarrationGenerator.ts'
import {announcementModel} from './announceKnots.ts'
import {auditionInput, auditionTranscript, voiceAuditions} from './lib/knots/voiceAuditions.ts'

export default async function auditionKnots() {
  const root = resolve(import.meta.dir, '..')
  const output = resolve(root, 'private/knot-voice-auditions')
  await fs.ensureDir(output)
  const manifest = []
  for (const candidate of voiceAuditions) {
    const input = auditionInput(candidate.character)
    const hash = createHash('sha256').update(JSON.stringify([announcementModel, candidate.voice, input])).digest('hex')
    const cache = resolve(output, 'cache', hash)
    const source = resolve(cache, 'source.wav')
    await fs.ensureDir(cache)
    if (!await fs.pathExists(source)) {
      const key = Bun.env.OPENROUTER_API_KEY
      if (!key) {
        throw new Error('OPENROUTER_API_KEY is missing.')
      }
      // Reserve before the paid request; interrupted runs must not silently pay again.
      await fs.writeFile(resolve(cache, 'request.json'), JSON.stringify({
        model: announcementModel,
        voice: candidate.voice,
        input,
      }, null, 2), {flag: 'wx'})
      try {
        await Bun.write(source, await new AuditionGenerator(key, candidate.voice).generate(input))
      } catch (error) {
        await fs.writeJson(resolve(cache, 'error.json'), {message: error instanceof Error ? error.message : String(error)}, {spaces: 2})
        throw error
      }
    }
    const file = resolve(output, `${candidate.id}.opus`)
    // One continuous performance of all five names; encode only once, never concatenate lossy re-encodes.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${source} -map 0:a:0 -map_metadata -1 -ac 1 -c:a libopus -b:a 80000 -vbr on -compression_level 10 -application audio ${file}`
    const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name:format=duration -of json ${file}`.json() as {format?: {duration?: string}
      streams?: Array<{codec_name?: string}>}
    const duration = Number(probe.format?.duration)
    if (probe.streams?.[0]?.codec_name !== 'opus' || !(duration > 0 && duration < 40)) {
      throw new Error(`Review the unexpected audition duration: ${file}`)
    }
    manifest.push({
      ...candidate,
      model: announcementModel,
      transcript: auditionTranscript,
      input,
      file,
      duration,
    })
    await fs.writeJson(resolve(output, 'manifest.json'), manifest, {spaces: 2})
    console.log(`${candidate.title} → ${file} (${duration.toFixed(2)} s)`)
  }
  return manifest
}

class AuditionGenerator extends NarrationGenerator {
  constructor(key: string, voice: string) {
    super(key, announcementModel, voice)
    this.headers['X-OpenRouter-Cache'] = 'false'
    delete this.headers['X-OpenRouter-Cache-TTL']
  }
}
if (import.meta.main) {
  await auditionKnots()
}
