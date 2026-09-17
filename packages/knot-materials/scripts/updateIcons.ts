import type {PreviewOptions} from './lib/withPreviewRenderer.ts'

import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'

import {knotCandidates} from '../src/main.ts'
import IconStaging from './lib/IconStaging.ts'
import withPreviewRenderer from './lib/withPreviewRenderer.ts'

export type UpdateIconsOptions = PreviewOptions & {candidates?: ReadonlyArray<string>}

export default async function updateIcons({candidates = [], ...preview}: UpdateIconsOptions = {}) {
  for (const id of candidates) {
    if (!knotCandidates.some(candidate => candidate.data.id === id)) {
      throw new Error(`Unknown Knot candidate: ${id}`)
    }
  }
  const selected = knotCandidates.filter(candidate => !candidates.length || candidates.includes(candidate.data.id))
  await using staging = await IconStaging.create()
  await withPreviewRenderer(async renderer => {
    for (const candidate of selected) {
      const input = {
        id: candidate.data.id,
        items: candidate.items,
        symbol: await readFile(new URL(`../src/candidates/${candidate.data.id}/symbol.svg`, import.meta.url), 'utf8'),
      }
      const result = await renderer.evaluate((instance, data) => instance.renderCandidate(data), input)
      await staging.add(result.icon, fileURLToPath(new URL(`../src/candidates/${input.id}/icon.jxl`, import.meta.url)))
      for (const item of result.items) {
        await staging.add(item.image, fileURLToPath(new URL(`../src/entries/${item.id}/icon.jxl`, import.meta.url)))
      }
      console.log(`${input.id}: ${result.items.length} knot icons and candidate icon.`)
    }
  }, preview)
  return await staging.publish()
}

export async function updateIconsCli(args = Bun.argv.slice(2)) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      'browser-url': {type: 'string'},
      'page-url': {type: 'string'},
    },
  })
  if (values.help) {
    console.log('Usage: bun scripts/updateIcons.ts [candidate ...] [--browser-url URL] [--page-url URL]')
    return
  }
  const outputs = await updateIcons({
    candidates: positionals,
    browserURL: values['browser-url'],
    pageURL: values['page-url'],
  })
  console.log(`Updated ${outputs.length} JXLs.`)
}

if (import.meta.main) {
  await updateIconsCli()
}
