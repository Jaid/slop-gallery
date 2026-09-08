import type {Portrait, Vec3} from './types.ts'

import {cameraPose, chime, loadBlob, newPortrait, notify} from './actions.ts'
import {maximumPortraits, useGallery} from './store.ts'
import {findPlacement, wallDistance} from './walls.ts'

export function imageSize(width: number, height: number, longest = 2.4) {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height) || width * height > 64_000_000) {
    throw new Error('Choose an image with at most 64 million pixels.')
  }
  const ratio = width / height
  if (ratio < 1 / 12 || ratio > 12) {
    throw new Error('This image is too panoramic for a frame. Try a crop between 1:12 and 12:1.')
  }
  return {
    width: longest * Math.min(1, ratio),
    height: longest * Math.min(1, 1 / ratio),
  }
}

export function containedRect(width: number, height: number, targetWidth: number, targetHeight: number) {
  const scale = Math.min(targetWidth / width, targetHeight / height)
  return [(targetWidth - width * scale) / 2, (targetHeight - height * scale) / 2, width * scale, height * scale] as const
}

/** Preserve the existing physical frame without stretching a provider’s differently shaped output. */
export async function fitGeneratedImage(source: Blob, aspect: number) {
  const bitmap = await createImageBitmap(source)
  try {
    imageSize(bitmap.width, bitmap.height)
    const longest = Math.min(3072, Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(longest * Math.min(1, aspect))), Math.max(1, Math.round(longest * Math.min(1, 1 / aspect))))
    const context = canvas.getContext('2d')!
    context.fillStyle = '#eee8d7'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, ...containedRect(bitmap.width, bitmap.height, canvas.width, canvas.height))
    return await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.94,
    })
  } finally {
    bitmap.close()
  }
}

export async function compositeImages(first: Blob | string, second: Blob | string) {
  const bitmaps: Array<ImageBitmap> = []
  try {
    for (const source of [first, second]) {
      bitmaps.push(await createImageBitmap(await loadBlob(source)))
    }
    const [a, b] = bitmaps as [ImageBitmap, ImageBitmap]
    const scale = Math.min(1, 2048 / Math.max(a.width, a.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(a.width * scale)), Math.max(1, Math.round(a.height * scale)))
    const context = canvas.getContext('2d')!
    context.drawImage(a, 0, 0, canvas.width, canvas.height)
    context.save()
    const {width: w, height: h} = canvas
    context.beginPath()
    context.moveTo(w * 0.48, 0)
    context.bezierCurveTo(w * 0.95, h * 0.3, w * 0.05, h * 0.7, w * 0.52, h)
    context.lineTo(w, h)
    context.lineTo(w, 0)
    context.closePath()
    context.clip()
    const fit = Math.max(w / b.width, h / b.height)
    context.drawImage(b, (w - b.width * fit) / 2, (h - b.height * fit) / 2, b.width * fit, b.height * fit)
    context.restore()
    context.strokeStyle = '#d6b779'
    context.lineWidth = Math.max(2, w * 0.003)
    context.beginPath()
    context.moveTo(w * 0.48, 0)
    context.bezierCurveTo(w * 0.95, h * 0.3, w * 0.05, h * 0.7, w * 0.52, h)
    context.stroke()
    return canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.94,
    })
  } finally {
    for (const bitmap of bitmaps) {
      bitmap.close()
    }
  }
}

export class ImageImporter {
  private queue = Promise.resolve()
  private disposed = false

  dispose() { this.disposed = true }
  constructor(private readonly onImport: (portrait: Portrait) => void) {}

  import(files: Array<File>, target?: {direction: Vec3
    origin: Vec3}) {
    const epoch = useGallery.getState().importEpoch
    // Capture the drop location before decoding; walking must not move an in-flight import.
    const pose = {
      position: [...cameraPose.position] as Vec3,
      direction: [...cameraPose.direction] as Vec3,
    }
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (this.disposed || useGallery.getState().importEpoch !== epoch) return
      let count = 0
      for (const file of files.slice(0, 12)) {
        try {
          if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'].includes(file.type) || file.size > 25_000_000) {
            throw new Error('Choose PNG, JPEG, WebP, AVIF or GIF under 25 mb.')
          }
          if (useGallery.getState().portraits.length >= maximumPortraits) {
            throw new Error('The collection is full. Remove a work to make room.')
          }
          const bitmap = await createImageBitmap(file)
          let size: ReturnType<typeof imageSize>
          let source: Blob
          try {
            size = imageSize(bitmap.width, bitmap.height)
            const scale = Math.min(1, 3072 / Math.max(bitmap.width, bitmap.height))
            const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
            const context = canvas.getContext('2d')
            if (!context) {
              throw new Error('The image could not be decoded.')
            }
            context.fillStyle = '#f2eee3'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
            source = await canvas.convertToBlob({
              type: 'image/webp',
              quality: 0.94,
            })
          } finally {
            bitmap.close()
          }
          // Reset/undo during decoding must not resurrect an abandoned import batch.
          if (this.disposed || useGallery.getState().importEpoch !== epoch) {
            break
          }
          const title = file.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]/g, ' ').trim().slice(0, 150) || 'An untitled arrival'
          const p = newPortrait(source, title, size.width, size.height, pose)
          const s = useGallery.getState()
          const place = target && findPlacement(target.origin, target.direction, p.width, p.height, s.portraits, p.id, s.secretOpen)
          if (place?.valid) {
            Object.assign(p, {
              position: place.position,
              rotation: place.rotation,
              wallId: place.wallId,
              hung: true,
            })
          } else {
            const distance = Math.min(1.6, Math.max(0.25, wallDistance(pose.position, pose.direction, s.secretOpen) - 0.35))
            p.position = [pose.position[0] + pose.direction[0] * distance, Math.max(0.8, pose.position[1] + pose.direction[1] * distance + count * 0.15), pose.position[2] + pose.direction[2] * distance]
          }
          s.add(p)
          count++
          this.onImport(p)
        } catch (error) {
          notify(error instanceof Error ? `${file.name}: ${error.message}` : 'That image could not be imported.')
        }
      }
      if (count) {
        chime(500)
        notify(`${count === 1 ? 'A new arrival' : `${count} new arrivals`}. ${target ? 'Any work that did not fit is waiting in front of you.' : 'Pick up a frame and find it a home.'}`)
      }
      if (files.length > 12) {
        notify('Import up to 12 images at a time. The first 12 have been processed.')
      }
    })
    return this.queue
  }
}
