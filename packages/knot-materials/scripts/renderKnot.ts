import {join, resolve} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import {knotsById} from '../src/main.ts'
import {animationFilename, animationFrames} from './lib/animation.ts'
import {encodeAnimatedJxl, encodeWebm} from './lib/encodeAnimation.ts'
import {encodeJxl} from './lib/encodeJxl.ts'
import {angleAnimationFrame, angleNames, angleStillFrame, closeupStillFrame, distanceNames, distanceStillFrame, inspectionAnimatedJxlDistance, inspectionAnimationFrame, inspectionAnimationFrames} from './lib/renderSettings.ts'
import withPreviewRenderer from './lib/withPreviewRenderer.ts'

export const renderCategories = ['snapshot', 'animation', 'video'] as const
export type RenderCategory = typeof renderCategories[number]
export type RenderKnotOptions = {
  categories?: ReadonlyArray<RenderCategory>
  onFile?: (filename: string) => void
}

const renderCategorySet = new Set<string>(renderCategories)
const renderRoot = resolve(import.meta.dir, '../out/render')
const imageBytes = (image: string) => Uint8Array.fromBase64(image)
const getKnot = (id: string) => {
  const item = knotsById.get(id)
  if (!item) {
    throw new Error(`Unknown Knot ID: ${id}`)
  }
  return item
}
const removeRenderedImage = async (directory: string, stem: string) => fs.remove(join(directory, `${stem}.jxl`))
const writeStill = async (image: string, directory: string, stem: string) => {
  const filename = `${stem}.jxl`
  const output = join(directory, filename)
  const input = `${output}.png`
  await fs.writeFile(input, imageBytes(image))
  try {
    await encodeJxl(input, output)
  } finally {
    await fs.remove(input)
  }
  return filename
}

export const parseRenderCategories = (value = renderCategories.join(',')): Array<RenderCategory> => {
  const requested = value.split(',').map(category => category.trim())
  if (requested.some(category => !category || !renderCategorySet.has(category))) {
    throw new Error(`Render category must be a comma-separated combination of: ${renderCategories.join(', ')}.`)
  }
  return [...new Set(requested)] as Array<RenderCategory>
}

export default async function renderKnot(id: string, {categories = renderCategories, onFile}: RenderKnotOptions = {}) {
  const item = getKnot(id)
  const selected = new Set(categories)
  if (selected.size === 0) {
    throw new Error('Select at least one render category.')
  }
  await fs.ensureDir(renderRoot)
  const staging = await fs.mkdtemp(join(renderRoot, `.${id}-`))
  const destination = join(renderRoot, id)
  try {
    if (selected.size < renderCategories.length && await fs.pathExists(destination)) {
      await fs.copy(destination, staging)
    }
    await withPreviewRenderer(async renderer => {
      const preview = await renderer.evaluateHandle((instance, entry) => instance.createPreview(entry), item)
      try {
        if (selected.has('snapshot')) {
          for (const name of angleNames) {
            await removeRenderedImage(staging, `angle_${name}`)
          }
          for (const name of distanceNames) {
            await removeRenderedImage(staging, `distance_${name}`)
          }
          await removeRenderedImage(staging, 'closeup')
          for (const [index, name] of angleNames.entries()) {
            const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), angleStillFrame(index))
            const filename = await writeStill(image, staging, `angle_${name}`)
            onFile?.(filename)
          }
          for (const [index, name] of distanceNames.entries()) {
            const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), distanceStillFrame(index))
            const filename = await writeStill(image, staging, `distance_${name}`)
            onFile?.(filename)
          }
          const closeup = await preview.evaluate((instance, frame) => instance.renderFrame(frame), closeupStillFrame())
          const closeupFilename = await writeStill(closeup, staging, 'closeup')
          onFile?.(closeupFilename)
        }
        if (selected.has('animation')) {
          await removeRenderedImage(staging, 'angles.animated')
          const angleFrames = join(staging, '.angle-frames')
          await fs.ensureDir(angleFrames)
          for (let index = 0; index < animationFrames; index++) {
            const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), angleAnimationFrame(index))
            await fs.writeFile(join(angleFrames, animationFilename(index)), imageBytes(image))
          }
          const filename = 'angles.animated.jxl'
          const encoded = await encodeAnimatedJxl(angleFrames, inspectionAnimatedJxlDistance)
          await fs.rename(encoded, join(staging, filename))
          await fs.remove(angleFrames)
          onFile?.(filename)
        }
        if (selected.has('video')) {
          const videoFrames = join(staging, '.animation-frames')
          await fs.ensureDir(videoFrames)
          for (let index = 0; index < inspectionAnimationFrames; index++) {
            const image = await preview.evaluate((instance, frame) => instance.renderFrame(frame), inspectionAnimationFrame(index))
            await fs.writeFile(join(videoFrames, animationFilename(index)), imageBytes(image))
          }
          const filename = 'animation.webm'
          await fs.rename(await encodeWebm(videoFrames, {frameCount: inspectionAnimationFrames}), join(staging, filename))
          await fs.remove(videoFrames)
          onFile?.(filename)
        }
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
      category: {type: 'string'},
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  })
  if (values.help) {
    console.log(`Usage: bun scripts/renderKnot.ts <knot-id> [--category snapshot,animation,video]
Categories can be snapshot, animation, video, or any comma-separated combination; default: snapshot,animation,video. Snapshots and the animated angle loop use JPEG XL. Video remains 1024x1024 AV1/WebM.`)
    return
  }
  if (positionals.length !== 1) {
    throw new Error('Specify exactly one canonical Knot ID. Use --help for usage.')
  }
  const id = positionals[0]
  getKnot(id)
  const categories = parseRenderCategories(values.category)
  console.log(`Output: out/render/${id}`)
  await renderKnot(id, {
    categories,
    onFile: filename => console.log(filename),
  })
}

if (import.meta.main) {
  await renderKnotCli()
}
