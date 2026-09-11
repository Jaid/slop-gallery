import {createHash} from 'node:crypto'
import {dirname, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import {knotAnnouncements} from '../src/lib/knots/announcements.ts'
import {knots} from '../src/lib/knots/index.ts'
import KnotNarrationGenerator from './lib/knots/KnotNarrationGenerator.ts'
import narrator from './lib/knots/narrator.ts'

const root = resolve(import.meta.dir, '..')

export function announcementInput(item: {id: string
  text: string}) {
  return /[!.?]$/u.test(item.text) ? item.text : `${item.text}.`
}

export function announcementDurationLimit(item: {id: string
  text: string}) {
  return item.id.includes('/slug/') ? 8 : Math.max(4, item.text.split(/\s+/u).length * 1.2 + 1)
}

export default async function announceKnots({ids = [], all = false, force = false, retryFailed = false, key = Bun.env.OPENROUTER_API_KEY, outputRoot = resolve(root, 'src/lib/knots'), cacheRoot = resolve(root, 'private/knot-announcements')}: {
  all?: boolean
  cacheRoot?: string
  force?: boolean
  ids?: ReadonlyArray<string>
  key?: string
  outputRoot?: string
  retryFailed?: boolean
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
  const staged: Array<{output: string
    temporary: string}> = []
  const failures: Array<{error: string
    id: string}> = []
  for (const item of selected) {
    try {
      const output = resolve(outputRoot, item.id, 'announce.opus')
      if (!force && await fs.pathExists(output)) {
        continue
      }
      const input = announcementInput(item)
      const request = {
        ...narrator,
        input,
        format: 'pcm',
      }
      const hash = createHash('sha256').update(JSON.stringify(request)).digest('hex')
      const cache = resolve(cacheRoot, hash)
      const recording = resolve(cache, 'source.wav')
      await fs.ensureDir(cache)
      if (!await fs.pathExists(recording)) {
        if (!key) {
          throw new Error('OPENROUTER_API_KEY is missing.')
        }
        // Exclusive reservation prevents accidental paid retries after interrupted requests.
        const reservation = resolve(cache, 'request.json')
        if (retryFailed && await fs.pathExists(reservation)) {
          await fs.move(reservation, resolve(cache, `request-${crypto.randomUUID()}.json`))
        }
        await fs.writeJson(reservation, request, {
          flag: 'wx',
          spaces: 2,
        })
        const audio = await new KnotNarrationGenerator(key, cache).generate(input, {
          format: 'pcm',
          providerOptions: narrator.providerOptions,
        })
        await Bun.write(recording, audio)
      }
      await fs.ensureDir(dirname(output))
      const temporary = resolve(cache, 'announce.opus')
      await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${recording} -map_metadata -1 -vn -ac 1 -c:a libopus -b:a 80000 -vbr on -compression_level 10 -application audio ${temporary}`
      const check = await Bun.$`ffprobe -v error -show_entries stream=codec_name:format=duration -of json ${temporary}`.json() as {format?: {duration: string}
        streams?: Array<{codec_name: string}>}
      if (check.streams?.[0]?.codec_name !== 'opus' || !(Number(check.format?.duration) > 0)) {
        throw new Error(`Invalid Opus announcement: ${item.id}`)
      }
      if (Number(check.format?.duration) > announcementDurationLimit(item)) {
        throw new Error(`Announcement is unexpectedly long; review the cached audio before publishing: ${item.id}`)
      }
      staged.push({
        temporary,
        output,
      })
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
  await fs.ensureDir(cacheRoot)
  await fs.writeJson(resolve(cacheRoot, 'failures.json'), failures, {spaces: 2})
  if (failures.length) {
    throw new Error(`${failures.length} announcements failed; no announcements were published. Successful recordings are cached. See ${resolve(cacheRoot, 'failures.json')}.`)
  }
  // Finish and validate the entire selection before replacing the previous voice.
  for (const {temporary, output} of staged) {
    await fs.copyFile(temporary, output)
  }
  return staged.map(item => item.output)
}

if (import.meta.main) {
  const {values, positionals} = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      all: {type: 'boolean'},
      force: {type: 'boolean'},
      'retry-failed': {type: 'boolean'},
    },
  })
  await announceKnots({
    ids: positionals,
    all: values.all,
    force: values.force,
    retryFailed: values['retry-failed'],
  })
}
