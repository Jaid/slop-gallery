import {parseArgs} from 'node:util'

import * as path from 'forward-slash-path'

import {knotAnnouncements} from '../src/lib/knots/announcements.ts'
import {knots} from '../src/lib/knots/index.ts'
import VoicePrerenderBatch from './lib/voice/VoicePrerenderBatch.ts'

const root = path.resolve(import.meta.dir, '..')

export function announcementInput(item: {id: string
  text: string}) {
  return item.text.trim().replace(/[!.?]+$/u, '')
}

export function announcementDurationLimit(item: {id: string
  text: string}) {
  return item.id.includes('/slug/') ? 8 : Math.max(4, item.text.split(/\s+/u).length * 1.2 + 1)
}

export default async function announceKnots({ids = [], all = false, force = false, retryFailed = false, key = Bun.env.XAI_API_KEY, telemetryEndpoint, outputRoot = path.resolve(root, 'src/lib/knots'), cacheRoot = path.resolve(root, 'private/production-voices')}: {
  all?: boolean
  cacheRoot?: string
  force?: boolean
  ids?: ReadonlyArray<string>
  key?: string
  outputRoot?: string
  retryFailed?: boolean
  telemetryEndpoint?: string
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
  return new VoicePrerenderBatch({
    cacheRoot,
    force,
    key,
    retryFailed,
    telemetryEndpoint,
  }).generate(selected.map(item => ({
    id: item.id,
    input: announcementInput(item),
    maximumDuration: announcementDurationLimit(item),
    output: path.resolve(outputRoot, item.id, 'announce.opus'),
  })))
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
