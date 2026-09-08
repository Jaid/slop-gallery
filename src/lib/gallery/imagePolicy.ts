import type {Portrait} from './types.ts'

export const imageExtensions = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
}
export const maximumPortraits = 120
export const maximumImageBytes = 25_000_000
export const maximumCollectionImageBytes = 150_000_000
// Base64 expansion, escaped metadata and gzip overhead must fit even for incompressible images.
export const maximumBackupBytes = 210_000_000

export function validateImage(source: Blob) {
  if (!Object.hasOwn(imageExtensions, source.type) || source.size > maximumImageBytes) {
    throw new Error('Choose PNG, JPEG, WebP, AVIF or GIF up to 25 mb.')
  }
}

export function validateCollectionImages(portraits: ReadonlyArray<Portrait>) {
  if (portraits.length > maximumPortraits) {
    throw new Error(`The gallery holds ${maximumPortraits} works. Remove a work before adding another.`)
  }
  let bytes = 0
  for (const {source} of portraits) {
    if (source instanceof Blob) {
      validateImage(source)
      bytes += source.size
    }
  }
  if (bytes > maximumCollectionImageBytes) {
    throw new Error('The collection can hold up to 150 mb of embedded images. Remove a work before adding more.')
  }
}

export function imageFilename(title: string, mime: string) {
  if (!Object.hasOwn(imageExtensions, mime)) {
    throw new Error('The artwork has an unsupported image type.')
  }
  const extension = imageExtensions[mime as keyof typeof imageExtensions][0]!
  return `${title.replaceAll(/[^\p{L}\p{N} -]/gu, '').slice(0, 70) || 'artwork'}${extension}`
}
