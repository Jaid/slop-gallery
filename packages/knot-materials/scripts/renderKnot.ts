import {join, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import {knotsById} from '../src/main.ts'
import {animationFilename, animationFrames} from './lib/animation.ts'
import {encodeAnimatedJxl, encodeWebm} from './lib/encodeAnimation.ts'
import {encodeJxl} from './lib/encodeJxl.ts'
import {angleAnimationFrame, angleNames, angleStillFrame, distanceNames, distanceStillFrame, inspectionAnimatedJxlDistance, inspectionAnimationFrame, inspectionAnimationFrames} from './lib/renderSettings.ts'
import withPreviewRenderer from './lib/withPreviewRenderer.ts'

const renderRoot = resolve(import.meta.dir, '../out/render')
const imageBytes = (image: string) => Uint8Array.fromBase64(image)
const encodeStill = async (image: string, output: string) => {
  const input = `${output}.png`
  await fs.writeFile(input, imageBytes(image))
  try {
    await encodeJxl(input, output)
  } finally {
    await fs.remove(input)
  }
}

export default async function renderKnot(id: string) {
  const item = knotsById.get(id)
  if (!item) {
    throw new Error(`Unknown Knot ID: ${id}`)
  }
  await fs.ensureDir(renderRoot)
  const staging = await fs.mkdtemp(join(renderRoot, `.${id}-`))
  const destination = join(renderRoot, id)
  try {
    await withPreviewRenderer(async renderer => {
      const preview = await renderer.evaluateHandle((instance, entry) => instance.createPreview(entry), item)
      try {
        console.info('Rendering angle stills...')
        for (const [index, name] of angleNames.entries()) {
          const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), angleStillFrame(index))
          await encodeStill(image, join(staging, `angle_${name}.jxl`))
        }
        console.info('Rendering simple angle animation...')
        const angleFrames = join(staging, '.angle-frames')
        await fs.ensureDir(angleFrames)
        for (let index = 0; index < animationFrames; index++) {
          const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), angleAnimationFrame(index))
          await fs.writeFile(join(angleFrames, animationFilename(index)), imageBytes(image))
        }
        await fs.rename(await encodeAnimatedJxl(angleFrames, inspectionAnimatedJxlDistance), join(staging, 'angles.animated.jxl'))
        await fs.remove(angleFrames)
        console.info('Rendering camera-distance stills...')
        for (const [index, name] of distanceNames.entries()) {
          const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), distanceStillFrame(index))
          await encodeStill(image, join(staging, `distance_${name}.jxl`))
        }
        console.info('Rendering combined inspection video...')
        const videoFrames = join(staging, '.animation-frames')
        await fs.ensureDir(videoFrames)
        for (let index = 0; index < inspectionAnimationFrames; index++) {
          const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), inspectionAnimationFrame(index))
          await fs.writeFile(join(videoFrames, animationFilename(index)), imageBytes(image))
        }
        await fs.rename(await encodeWebm(videoFrames, {frameCount: inspectionAnimationFrames}), join(staging, 'animation.webm'))
        await fs.remove(videoFrames)
      } finally {
        try {
          await preview.evaluate(instance => instance.dispose())
        } finally {
          await preview.dispose()
        }
      }
    })
    await fs.remove(destination)
    await fs.rename(staging, destination)
    return destination
  } catch (error) {
    await fs.remove(staging)
    throw error
  }
}

export const renderKnotCli = async (args = Bun.argv.slice(2)) => {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  })
  if (values.help) {
    console.log('Usage: bun scripts/renderKnot.ts <knot-id>\nWrites three 2048x2048 JXL angle stills (0°, 45°, 90°), two camera-distance JXL stills (near/far), one 120-frame animated JXL angle loop, and one combined 16-second AV1/WebM animation.webm to out/render/<knot-id>.')
    return
  }
  if (positionals.length !== 1) {
    throw new Error('Specify exactly one canonical Knot ID. Use --help for usage.')
  }
  console.log(await renderKnot(positionals[0]))
}

if (import.meta.main) {
  await renderKnotCli()
}
