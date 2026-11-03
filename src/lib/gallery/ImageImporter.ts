import type {Portrait, Vec3} from './types.ts'

import world from '#src/worlds/current.ts'

import {arrivalFrame, cameraPose, chime, loadBlob, newPortrait, notify} from './actions.ts'
import {maximumPortraits, validateImage} from './imagePolicy.ts'
import {useGallery} from './store.ts'

/** an image with its size in pixels */
export type SizedImage = {
  height: number
  image: Blob
  width: number
}

/** The frame of an image in meters: its own aspect at an area of `area` cm². */
export function imageSize(width: number, height: number, area = 30_000) {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height) || width * height > 64_000_000) {
    throw new Error('Choose an image with at most 64 million pixels.')
  }
  const ratio = width / height
  if (ratio < 1 / 12 || ratio > 12) {
    throw new Error('This image is too panoramic for a frame. Try a crop between 1:12 and 12:1.')
  }
  const squareMeters = area / 10_000
  return {
    width: Math.sqrt(squareMeters * ratio),
    height: Math.sqrt(squareMeters / ratio),
  }
}

/** The centered part of an image, as x, y, width and height, that is at most `limit` times as wide as tall or as tall as wide. */
export function centeredCrop(width: number, height: number, limit = 2) {
  const cropWidth = Math.min(width, height * limit)
  const cropHeight = Math.min(height, width * limit)
  return [(width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight] as const
}

/** A provider’s output as a work keeps it: in whatever shape it came, at most 3072 px on its longer edge, on an opaque ground. */
export async function encodeGeneratedImage(source: Blob) {
  const bitmap = await createImageBitmap(source)
  try {
    imageSize(bitmap.width, bitmap.height)
    const scale = Math.min(1, 3072 / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    const context = canvas.getContext('2d')!
    context.fillStyle = '#eee8d7'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await canvasImage(canvas)
  } finally {
    bitmap.close()
  }
}

/** The local stand-in for a merge of several images: a cut-paper collage in the shape of the first, which every further one covers from a wavy cut on, each cut further right, the cuts gilded. */
export async function compositeImages(sources: ReadonlyArray<Blob | string>) {
  if (!sources.length) {
    throw new Error('A collage needs at least one image.')
  }
  const bitmaps: Array<ImageBitmap> = []
  try {
    for (const source of sources) {
      bitmaps.push(await createImageBitmap(await loadBlob(source)))
    }
    const [base, ...others] = bitmaps
    const scale = Math.min(1, 2048 / Math.max(base.width, base.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(base.width * scale)), Math.max(1, Math.round(base.height * scale)))
    const context = canvas.getContext('2d')!
    context.drawImage(base, 0, 0, canvas.width, canvas.height)
    const {width: w, height: h} = canvas
    // Cut k of n images runs around k/n of the width, swinging out less the more images share it.
    const cut = (index: number) => {
      const middle = (index + 1) / bitmaps.length
      const swing = 0.9 / bitmaps.length
      const slant = 0.04 / bitmaps.length
      context.moveTo(w * (middle - slant), 0)
      context.bezierCurveTo(w * (middle + swing), h * 0.3, w * (middle - swing), h * 0.7, w * (middle + slant), h)
    }
    for (const [index, image] of others.entries()) {
      context.save()
      context.beginPath()
      cut(index)
      context.lineTo(w, h)
      context.lineTo(w, 0)
      context.closePath()
      context.clip()
      const fit = Math.max(w / image.width, h / image.height)
      context.drawImage(image, (w - image.width * fit) / 2, (h - image.height * fit) / 2, image.width * fit, image.height * fit)
      context.restore()
    }
    context.strokeStyle = '#d6b779'
    context.lineWidth = Math.max(2, w * 0.003)
    for (const index of others.keys()) {
      context.beginPath()
      cut(index)
      context.stroke()
    }
    return await canvasImage(canvas)
  } finally {
    for (const bitmap of bitmaps) {
      bitmap.close()
    }
  }
}

/** The local stand-in for an ingredient’s instruction, like an orb’s prompt: the work washed in the ingredient’s glow and darkened toward its edges by it. */
export async function tintImage(source: Blob | string, color: string) {
  const bitmap = await createImageBitmap(await loadBlob(source))
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)))
    const context = canvas.getContext('2d')!
    const {width: w, height: h} = canvas
    context.drawImage(bitmap, 0, 0, w, h)
    context.globalCompositeOperation = 'color'
    context.globalAlpha = 0.5
    context.fillStyle = color
    context.fillRect(0, 0, w, h)
    context.globalCompositeOperation = 'multiply'
    context.globalAlpha = 1
    const vignette = context.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2)
    vignette.addColorStop(0, 'white')
    vignette.addColorStop(1, color)
    context.fillStyle = vignette
    context.fillRect(0, 0, w, h)
    return await canvasImage(canvas)
  } finally {
    bitmap.close()
  }
}

async function canvasImage(canvas: OffscreenCanvas): Promise<SizedImage> {
  return {
    image: await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.94,
    }),
    width: canvas.width,
    height: canvas.height,
  }
}

export default class ImageImporter {
  private disposed = false
  private queue = Promise.resolve()

  constructor(private readonly onImport: (portrait: Portrait) => void) {}
  dispose() {
    this.disposed = true
  }

  import(files: Array<File>, target?: {
    direction: Vec3
    origin: Vec3
  }) {
    // Capture the drop location before decoding; walking must not move an in-flight import.
    const pose = {
      position: [...cameraPose.position] as Vec3,
      direction: [...cameraPose.direction] as Vec3,
    }
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (this.disposed) {
        return
      }
      let count = 0
      for (const file of files.slice(0, 12)) {
        try {
          validateImage(file)
          if (useGallery.getState().portraits.length >= maximumPortraits) {
            throw new Error('The collection is full. Remove a work to make room.')
          }
          const bitmap = await createImageBitmap(file)
          let size: ReturnType<typeof imageSize>
          let source: Blob
          try {
            // Works wider than 2:1 or taller than 1:2 keep only their middle.
            const crop = centeredCrop(bitmap.width, bitmap.height)
            const [, , cropWidth, cropHeight] = crop
            size = imageSize(cropWidth, cropHeight)
            const scale = Math.min(1, 3072 / Math.max(cropWidth, cropHeight))
            const canvas = new OffscreenCanvas(Math.max(1, Math.round(cropWidth * scale)), Math.max(1, Math.round(cropHeight * scale)))
            const context = canvas.getContext('2d')
            if (!context) {
              throw new Error('The image could not be decoded.')
            }
            context.fillStyle = '#f2eee3'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.drawImage(bitmap, ...crop, 0, 0, canvas.width, canvas.height)
            source = await canvas.convertToBlob({
              type: 'image/webp',
              quality: 0.94,
            })
          } finally {
            bitmap.close()
          }
          // dispose() can run during decoding, which the narrowing from the check above cannot see.
          if (this.disposed as boolean) {
            break
          }
          const title = file.name.replace(/\.[^.]+$/, '').replaceAll(/[-_]/g, ' ').trim().slice(0, 150) || 'An untitled arrival'
          const p = newPortrait(source, title, size.width, size.height, pose)
          const s = useGallery.getState()
          const place = target && world.placement.findPlacement(target.origin, target.direction, p.width, p.height, s.portraits, p.id)
          if (place?.valid) {
            Object.assign(p, {
              position: place.position,
              rotation: place.rotation,
              wallId: place.wallId,
              labelAbove: place.labelAbove === true ? true : undefined,
              hung: true,
            })
          } else {
            const distance = Math.min(1.6, Math.max(0.25, world.wallDistance(pose.position, pose.direction) - 0.35))
            p.position = [pose.position[0] + pose.direction[0] * distance, Math.max(world.placement.floorHeight([pose.position[0] + pose.direction[0] * distance, pose.position[1], pose.position[2] + pose.direction[2] * distance]) + 0.8, pose.position[1] + pose.direction[1] * distance + count * 0.15), pose.position[2] + pose.direction[2] * distance]
          }
          // Where it hangs or lands decides its frame, which may be another room’s than the player’s, through a doorway.
          p.frame = arrivalFrame(p.position, pose.position)
          s.add(p)
          count++
          this.onImport(p)
        } catch (error) {
          notify(Error.isError(error) ? `${file.name}: ${error.message}` : 'That image could not be imported.')
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
