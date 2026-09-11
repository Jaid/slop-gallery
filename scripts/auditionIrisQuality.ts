import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

import IrisQualityAudition from './lib/knots/IrisQualityAudition.ts'

export default async function auditionIrisQuality({retryFailed = false, compareLoud = false} = {}) {
  const output = resolve(import.meta.dir, '../private/iris-quality')
  if (compareLoud) {
    const runner = new IrisQualityAudition(output, 'xai', Bun.env.XAI_API_KEY ?? '', retryFailed)
    const loud = resolve(output, 'xai-loud-quality.opus')
    if (!await Bun.file(loud).exists()) {
      await runner.run()
    }
    const plain = await runner.run({loud: false})
    console.log(`Loud → ${loud}\nPlain → ${plain.opus}`)
    return
  }
  for (const transport of ['xai', 'openrouter'] as const) {
    const key = transport === 'xai' ? Bun.env.XAI_API_KEY : Bun.env.OPENROUTER_API_KEY
    const runner = new IrisQualityAudition(output, transport, key ?? '', retryFailed)
    for (const normalization of [false, true]) {
      const manifest = await runner.run({normalization})
      console.log(`${manifest.id}: ${manifest.sampleRate} Hz → ${manifest.opus}`)
    }
  }
}

if (import.meta.main) {
  const {values} = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'retry-failed': {type: 'boolean'},
      'compare-loud': {type: 'boolean'},
    },
  })
  await auditionIrisQuality({
    retryFailed: values['retry-failed'],
    compareLoud: values['compare-loud'],
  })
}
