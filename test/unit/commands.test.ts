import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {galleryEvents, importDroppedFiles, isTextInput, viewPortrait} from '../../src/lib/gallery/actions.ts'
import ImageImporter from '../../src/lib/gallery/ImageImporter.ts'
import {imageFilename} from '../../src/lib/gallery/imagePolicy.ts'
import {createDocument, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'

const original = createDocument()
const previous = {
  HTMLElement: globalThis.HTMLElement,
  createImageBitmap: globalThis.createImageBitmap,
  OffscreenCanvas: globalThis.OffscreenCanvas,
}
class ElementDouble extends EventTarget {
  isContentEditable = false
  constructor(readonly editable = false) {
    super()
  }
  closest(selector: string) {
    return this.editable && selector === 'input, textarea, select' ? this : null
  }
}
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({
    sound: false,
    ready: false,
    importTarget: null,
    importFiles: null,
  })
  Object.assign(globalThis, {HTMLElement: ElementDouble})
})
afterEach(() => Object.assign(globalThis, previous))
test('renderer-free drops decode and commit', async () => {
  Object.assign(globalThis, {
    createImageBitmap: async () => ({
      width: 64,
      height: 64,
      close() {},
    }),
    OffscreenCanvas: class {
      async convertToBlob() {
        return new Blob(['normalized'], {type: 'image/webp'})
      }
      getContext() {
        return {
          fillStyle: '',
          fillRect() {},
          drawImage() {},
        }
      }
    },
  })
  const importer = new ImageImporter(() => {})
  useGallery.setState({importFiles: (files, target) => importer.import(files, target)})
  try {
    await importDroppedFiles([new File(['pixels'], 'fallback.png', {type: 'image/png'})], 100, 100)
    expect(useGallery.getState().portraits).toHaveLength(original.portraits.length + 1)
  } finally {
    importer.dispose()
  }
})
test('scene placement is optional', async () => {
  const target = {
    origin: [0, 2, 0] as [number, number, number],
    direction: [0, 0, -1] as [number, number, number],
  }
  const calls: Array<unknown> = []
  useGallery.setState({
    importTarget: () => target,
    importFiles: async (_files, ray) => {
      calls.push(ray)
    },
  })
  await importDroppedFiles([], 12, 34)
  useGallery.setState({importTarget: null})
  await importDroppedFiles([], 12, 34)
  expect(calls).toEqual([target, undefined])
})
test('unavailable navigation does not dispatch a visit', () => {
  const spy = spyOn(galleryEvents, 'dispatchEvent')
  try {
    viewPortrait('goose')
    expect(spy).not.toHaveBeenCalled()
  } finally {
    spy.mockRestore()
  }
})
test('only editable controls count as text input, not whole dialogs', () => {
  expect(isTextInput(new ElementDouble)).toBe(false)
  expect(isTextInput(new ElementDouble(true))).toBe(true)
  const content = new ElementDouble
  content.isContentEditable = true
  expect(isTextInput(content)).toBe(true)
})
for (const [mime, extension] of [['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/avif', 'avif'], ['image/gif', 'gif']]) {
  test(`download filenames preserve ${mime}`, () => {
    expect(imageFilename('Pigeon / 🐦', mime)).toBe(`Pigeon  .${extension}`)
  })
}
test('unknown download types are never mislabeled as WebP', () => {
  expect(() => imageFilename('artwork', 'image/unknown')).toThrow()
})
