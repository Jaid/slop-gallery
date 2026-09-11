import {parseArgs} from 'node:util'

import * as path from 'forward-slash-path'

import portraits from '../src/levels/gallery/collection.ts'
import {knotAnnouncements} from '../src/lib/knots/announcements.ts'
import {knots} from '../src/lib/knots/index.ts'
import {announcementDurationLimit, announcementInput} from './announceKnots.ts'
import VoicePrerenderBatch from './lib/voice/VoicePrerenderBatch.ts'

const root = path.resolve(import.meta.dir, '..')

export function prerenderInventory() {
  return [
    ...knotAnnouncements(knots).map(item => ({
      id: `knots/${item.id}`,
      input: announcementInput(item),
      maximumDuration: announcementDurationLimit(item),
      output: path.resolve(root, 'src/lib/knots', item.id, 'announce.opus'),
    })),
    ...portraits.map(portrait => ({
      id: `gallery/${portrait.id}`,
      // Keep internal sentence boundaries, but do not append punctuation to the utterance.
      input: `${announcementInput({
        id: portrait.id,
        text: portrait.title,
      })}. ${portrait.description.trim()}`.replace(/[!.?]+$/u, ''),
      maximumDuration: 60,
      output: path.resolve(root, `public${portrait.narration}`),
    })),
  ]
}

/** Explicit full replacement: no production assets change until every render has passed validation. */
export default async function prerenderAllVoices({retryFailed = false}: {retryFailed?: boolean} = {}) {
  return new VoicePrerenderBatch({
    cacheRoot: path.resolve(root, 'private/production-voices'),
    force: true,
    retryFailed,
  }).generate(prerenderInventory())
}

if (import.meta.main) {
  const {values} = parseArgs({
    args: Bun.argv.slice(2),
    options: {'retry-failed': {type: 'boolean'}},
  })
  console.log(JSON.stringify(await prerenderAllVoices({retryFailed: values['retry-failed']}), null, 2))
}
