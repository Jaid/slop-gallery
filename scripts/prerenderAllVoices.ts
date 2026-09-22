import {parseArgs} from 'node:util'

import * as path from 'forward-slash-path'

import portraits from '../src/levels/gallery/collection.ts'
import VoicePrerenderBatch from './lib/voice/VoicePrerenderBatch.ts'

const root = path.resolve(import.meta.dir, '..')
const announcementInput = (text: string) => text.trim().replace(/[!.?]+$/u, '')

export function prerenderInventory() {
  return portraits.map(portrait => ({
    id: `gallery/${portrait.id}`,
    // Keep internal sentence boundaries, but do not append punctuation to the utterance.
    input: `${announcementInput(portrait.title)}. ${portrait.description.trim()}`.replace(/[!.?]+$/u, ''),
    maximumDuration: 60,
    output: path.resolve(root, `public${portrait.narration}`),
  }))
}

/** Explicit full replacement for the remaining prerecorded gallery narration. */
export default async function prerenderAllVoices({retryFailed = false}: {retryFailed?: boolean} = {}) {
  const batch = new VoicePrerenderBatch({
    cacheRoot: path.resolve(root, 'private/production-voices'),
    force: true,
    retryFailed,
  })
  return batch.generate(prerenderInventory())
}

if (import.meta.main) {
  const {values} = parseArgs({
    args: Bun.argv.slice(2),
    options: {'retry-failed': {type: 'boolean'}},
  })
  console.log(JSON.stringify(await prerenderAllVoices({retryFailed: values['retry-failed']}), null, 2))
}
