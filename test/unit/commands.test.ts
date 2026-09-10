import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import Collection from '../../src/components/App/Collection.tsx'
import History from '../../src/components/App/History.tsx'
import Map from '../../src/components/App/Map.tsx'
import Settings from '../../src/components/App/Settings.tsx'
import {galleryEvents, handleGalleryKey, importDroppedFiles, isTextInput, viewPortrait} from '../../src/lib/gallery/actions.ts'
import {ImageImporter} from '../../src/lib/gallery/ImageImporter.ts'
import {imageFilename} from '../../src/lib/gallery/imagePolicy.ts'
import {createDocument, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'

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
    panel: 'collection',
    importTarget: null,
    importFiles: null,
  })
  Object.assign(globalThis, {HTMLElement: ElementDouble})
})
afterEach(() => Object.assign(globalThis, previous))
test('collection and preferences expose Add artwork, backups and visible history without a renderer', () => {
  expect(renderToStaticMarkup(createElement(Collection))).toContain('Add artwork')
  expect(renderToStaticMarkup(createElement(Settings))).toContain('Export collection')
  expect(renderToStaticMarkup(createElement(Settings))).toContain('Restore a backup')
  const history = renderToStaticMarkup(createElement(History))
  expect(history).toContain('Collection history')
  expect(history).toContain('Undo')
  expect(history).toContain('Redo')
  const map = renderToStaticMarkup(createElement(Map))
  expect(map.match(/disabled=""/g)).toHaveLength(rooms.length)
})
test('renderer-free drops decode, commit and support undo/redo inside Collection', async () => {
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
    let prevented = 0
    const key = (redo = false, target = new ElementDouble) => handleGalleryKey({
      code: redo ? 'KeyY' : 'KeyZ',
      ctrlKey: true,
      target,
      preventDefault() {
        prevented++
      },
    } as unknown as KeyboardEvent)
    key(false, new ElementDouble(true))
    expect(useGallery.getState().portraits).toHaveLength(original.portraits.length + 1)
    expect(prevented).toBe(0)
    key()
    expect(useGallery.getState().portraits).toHaveLength(original.portraits.length)
    key(true)
    expect(useGallery.getState().portraits).toHaveLength(original.portraits.length + 1)
    expect(prevented).toBe(2)
  } finally {
    importer.dispose()
  }
})
test('scene placement is optional and ignored while a panel owns the drop', async () => {
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
  useGallery.setState({panel: null})
  await importDroppedFiles([], 12, 34)
  expect(calls).toEqual([undefined, target])
})
test('unavailable navigation does not close Collection or dispatch a visit', () => {
  const spy = spyOn(galleryEvents, 'dispatchEvent')
  try {
    viewPortrait('goose')
    expect(useGallery.getState().panel).toBe('collection')
    expect(spy).not.toHaveBeenCalled()
  } finally {
    spy.mockRestore()
  }
})
test('only editable controls retain native text undo, not whole dialogs', () => {
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
