import type {PreviewOptions} from './lib/withPreviewRenderer.ts'

import {extname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'

import {knotsById} from '../src/main.ts'
import IconStaging from './lib/IconStaging.ts'
import withPreviewRenderer from './lib/withPreviewRenderer.ts'

export type MakeIconOptions = PreviewOptions & {
  id: string
  output?: string
}

/** Render one canonical knot ID to a tightly cropped, alpha-preserving JXL icon. */
export default async function makeIcon({id, output, ...preview}: MakeIconOptions) {
  const item = knotsById.get(id)
  if (!item) {
    throw new Error(`Unknown Knot ID: ${id}`)
  }
  const destination = output ? resolve(output) : fileURLToPath(new URL(`../src/entries/${id}/icon.jxl`, import.meta.url))
  if (extname(destination).toLowerCase() !== '.jxl') {
    throw new Error('Knot icons must use the .jxl extension.')
  }
  await using staging = await IconStaging.create()
  await withPreviewRenderer(async renderer => {
    const image = await renderer.evaluate((instance, entry) => instance.renderIcon(entry), item)
    await staging.add(image, destination)
  }, preview)
  await staging.publish()
  return destination
}

if (import.meta.main) {
  const {values, positionals} = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      output: {
        type: 'string',
        short: 'o',
      },
      'browser-url': {type: 'string'},
      'page-url': {type: 'string'},
    },
  })
  if (values.help) {
    console.log('Usage: bun scripts/makeIcon.ts <knot-id> [--output icon.jxl] [--browser-url URL] [--page-url URL]')
  } else {
    if (positionals.length !== 1) {
      throw new Error('Specify exactly one canonical Knot ID. Use --help for usage.')
    }
    console.log(await makeIcon({
      id: positionals[0],
      output: values.output,
      browserURL: values['browser-url'],
      pageURL: values['page-url'],
    }))
  }
}
