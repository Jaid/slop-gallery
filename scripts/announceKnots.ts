import {createHash} from 'node:crypto'
import {dirname, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import NarrationGenerator from '../src/lib/ai/NarrationGenerator.ts'
import {knotAnnouncements} from '../src/lib/knots/announcements.ts'
import {knots} from '../src/lib/knots/index.ts'

const root = resolve(import.meta.dir, '..')
export const announcementModel = 'google/gemini-3.1-flash-tts-preview'
export const announcementVoice = 'Algenib'
export const announcementCharacter = 'Calm, wise museum narrator. Speak in clear American English with measured, natural pacing. Read exactly the transcript once, then stop.'

export function announcementInput(item: {id: string, text: string}) {
  const direction = item.id.includes('/slug/') ? 'Read model letters and version numbers in English.' : 'Speak the title as words, without spelling it out or adding anything.'
  const transcript = /[.!?]$/u.test(item.text) ? item.text : `${item.text}.`
  return `## character\n${announcementCharacter} ${direction}\n\n## transcript\n${transcript}`
}

export function announcementDurationLimit(item: {id: string, text: string}) {
  return item.id.includes('/slug/') ? 8 : Math.max(4, item.text.split(/\s+/u).length * 1.2 + 1)
}

class KnotNarrationGenerator extends NarrationGenerator {
  constructor(key: string) {
    super(key, announcementModel, announcementVoice)
    // Recordings are cached locally; do not replay a cached provider error.
    this.headers['X-OpenRouter-Cache'] = 'false'
    delete this.headers['X-OpenRouter-Cache-TTL']
  }
}

export async function announceKnots({ids = [], all = false, force = false, key = Bun.env.OPENROUTER_API_KEY}: {
  all?: boolean
  force?: boolean
  ids?: ReadonlyArray<string>
  key?: string
} = {}) {
  const inventory = knotAnnouncements(knots)
  if (!all && !ids.length) {
    throw new Error('Specify announcement IDs, or --all after reviewing the samples.')
  }
  for (const id of ids) {
    if (!inventory.some(item => item.id === id)) {
      throw new Error(`Unknown announcement: ${id}`)
    }
  }
  const selected = inventory.filter(item => all || ids.includes(item.id))
  const generated: Array<string> = []
  const failures: Array<{error: string
    id: string}> = []
  for (const item of selected) {
    try {
      const output = resolve(root, 'src/lib/knots', item.id, 'announce.opus')
      if (!force && await fs.pathExists(output)) {
        continue
      }
      const input = announcementInput(item)
      const hash = createHash('sha256').update(JSON.stringify([announcementModel, announcementVoice, input, 'pcm-wave-v1'])).digest('hex')
      const cache = resolve(root, 'private/knot-announcements', hash)
      const recording = resolve(cache, 'source.wav')
      await fs.ensureDir(cache)
      if (!await fs.pathExists(recording)) {
        if (!key) {
          throw new Error('OPENROUTER_API_KEY is missing.')
        }
        // Exclusive reservation prevents accidental paid retries after interrupted requests.
        await fs.writeFile(resolve(cache, 'request.json'), JSON.stringify({
          model: announcementModel,
          voice: announcementVoice,
          input,
        }, null, 2), {flag: 'wx'})
        const audio = await new KnotNarrationGenerator(key).generate(input)
        await Bun.write(recording, audio)
      }
      await fs.ensureDir(dirname(output))
      const temporary = resolve(cache, 'announce.opus')
      await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${recording} -map_metadata -1 -vn -ac 1 -c:a libopus -b:a 64k -vbr on -compression_level 10 ${temporary}`
      const check = await Bun.$`ffprobe -v error -show_entries stream=codec_name:format=duration -of json ${temporary}`.json()
      if (check.streams?.[0]?.codec_name !== 'opus' || !(Number(check.format?.duration) > 0)) {
        throw new Error(`Invalid Opus announcement: ${item.id}`)
      }
      if (Number(check.format.duration) > announcementDurationLimit(item)) {
        throw new Error(`Announcement is unexpectedly long; review the cached audio before publishing: ${item.id}`)
      }
      await fs.copyFile(temporary, output)
      generated.push(output)
      console.log(`${item.text} → ${output}`)
    } catch (error) {
      const failure = {
        id: item.id,
        error: error instanceof Error ? error.message : String(error),
      }
      failures.push(failure)
      console.error(`${failure.id}: ${failure.error}`)
    }
  }
  await fs.ensureDir(resolve(root, 'private/knot-announcements'))
  await fs.writeJson(resolve(root, 'private/knot-announcements/failures.json'), failures, {spaces: 2})
  if (failures.length) {
    throw new Error(`${failures.length} announcements failed; successful recordings are saved. See private/knot-announcements/failures.json.`)
  }
  return generated
}

if (import.meta.main) {
  const {values, positionals} = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      all: {type: 'boolean'},
      force: {type: 'boolean'},
    },
  })
  await announceKnots({
    ids: positionals,
    all: values.all,
    force: values.force,
  })
}
