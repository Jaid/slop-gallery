import type {PreviewOptions} from './lib/withPreviewRenderer.ts'

import {tmpdir} from 'node:os'
import {extname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import {knotsById} from '../src/main.ts'
import {animationFilename, animationFrames} from './lib/animation.ts'
import encodeAnimation, {validateAnimationEffort} from './lib/encodeAnimation.ts'
import IconStaging from './lib/IconStaging.ts'
import withPreviewRenderer from './lib/withPreviewRenderer.ts'

export type AnimatedIconOptions = PreviewOptions & {
  effort?: number
  id: string
  output?: string
}

/** 120 fixed-size source frames, one full Y-axis turn, exactly two seconds at 60 fps. */
export default async function makeAnimatedIcon({id, output, effort = 7, ...preview}: AnimatedIconOptions) {
  const item = knotsById.get(id)
  if (!item) {
    throw new Error(`Unknown Knot ID: ${id}`)
  }
  validateAnimationEffort(effort)
  const destination = output ? resolve(output) : fileURLToPath(new URL(`../src/entries/${id}/icon.animated.webm`, import.meta.url))
  if (extname(destination).toLowerCase() !== '.webm') {
    throw new Error('Animated Knot icons must use the .webm extension.')
  }
  const directory = await fs.mkdtemp(join(tmpdir(), 'knot-animation-'))
  try {
    await withPreviewRenderer(async renderer => {
      const animation = await renderer.evaluateHandle((instance, entry) => instance.createAnimation(entry), item)
      try {
        for (let index = 0; index < animationFrames; index++) {
          const image = await animation.evaluate((instance, frame) => instance.renderFrame(frame), index)
          await fs.writeFile(join(directory, animationFilename(index)), Uint8Array.fromBase64(image))
        }
      } finally {
        try {
          await animation.evaluate(instance => instance.dispose())
        } finally {
          await animation.dispose()
        }
      }
    }, preview)
    const encoded = await encodeAnimation(directory, effort)
    await using staging = await IconStaging.create()
    staging.addEncoded(encoded, destination)
    await staging.publish()
    return destination
  } finally {
    await fs.remove(directory)
  }
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
      effort: {type: 'string'},
      'browser-url': {type: 'string'},
      'page-url': {type: 'string'},
    },
  })
  if (values.help) {
    console.log('Usage: bun scripts/makeAnimatedIcon.ts <knot-id> [--output icon.animated.webm] [--effort 7] [--browser-url URL] [--page-url URL]\n120 frames, 2 seconds, 360 degrees, 640x640 AV1/WebM. Requires ffmpeg.')
  } else {
    if (positionals.length !== 1) {
      throw new Error('Specify exactly one canonical Knot ID. Use --help for usage.')
    }
    console.log(await makeAnimatedIcon({
      id: positionals[0],
      output: values.output,
      effort: values.effort === undefined ? undefined : Number(values.effort),
      browserURL: values['browser-url'],
      pageURL: values['page-url'],
    }))
  }
}
