import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

import IrisQualityAudition from './lib/knots/IrisQualityAudition.ts'

export default async function auditionIrisQuality({retryFailed = false} = {}) {
  const output = resolve(import.meta.dir, '../private/iris-quality')
  for (const transport of ['xai', 'openrouter'] as const) {
    const key = transport === 'xai' ? Bun.env.XAI_API_KEY : Bun.env.OPENROUTER_API_KEY
    const runner = new IrisQualityAudition(output, transport, key ?? '', retryFailed)
    for (const normalization of [false, true]) {
      const manifest = await runner.run(normalization)
      console.log(`${manifest.id}: ${manifest.sampleRate} Hz → ${manifest.opus}`)
    }
  }
}

if (import.meta.main) {
  const {values} = parseArgs({
    args: Bun.argv.slice(2),
    options: {'retry-failed': {type: 'boolean'}},
  })
  await auditionIrisQuality({retryFailed: values['retry-failed']})
}
