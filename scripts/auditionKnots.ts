import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import VoiceAuditionRunner from './lib/knots/VoiceAuditionRunner.ts'
import {voiceAuditions} from './lib/knots/voiceAuditions.ts'

export default async function auditionKnots({ids = [], output = resolve(import.meta.dir, '../private/knot-voice-consistency'), key = Bun.env.OPENROUTER_API_KEY, retryFailed = false}: {
  ids?: Array<string>
  key?: string
  output?: string
  retryFailed?: boolean
} = {}) {
  for (const id of ids) {
    if (!voiceAuditions.some(candidate => candidate.id === id)) {
      throw new Error(`Unknown voice audition: ${id}`)
    }
  }
  const pending = voiceAuditions.filter(candidate => !ids.length || ids.includes(candidate.id))
  const runner = new VoiceAuditionRunner(output, key, retryFailed)
  const errors: Array<string> = []
  // Independent voices can run concurrently; each voice still uses five separate requests.
  await Promise.all(Array.from({length: 3}, async () => {
    for (let candidate = pending.shift(); candidate; candidate = pending.shift()) {
      try {
        const result = await runner.run(candidate)
        console.log(`${candidate.title} → ${result.file}`)
      } catch (error) {
        const message = `${candidate.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(message)
        console.error(message)
      }
    }
  }))
  const manifest: Array<Awaited<ReturnType<VoiceAuditionRunner['run']>>> = []
  for (const candidate of voiceAuditions) {
    const path = resolve(output, candidate.id, 'manifest.json')
    if (await fs.pathExists(path)) {
      manifest.push(await fs.readJson(path) as Awaited<ReturnType<VoiceAuditionRunner['run']>>)
    }
  }
  await fs.outputJson(resolve(output, 'manifest.json'), manifest, {spaces: 2})
  if (errors.length) {
    throw new Error(errors.join('\n'))
  }
  return manifest
}

if (import.meta.main) {
  const {values, positionals} = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      'retry-failed': {
        type: 'boolean',
        default: false,
      },
    },
  })
  await auditionKnots({
    ids: positionals,
    retryFailed: values['retry-failed'],
  })
}
