import {afterEach, describe, expect, test} from 'bun:test'

import encodePng from '../src/encodePng.ts'

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
const originalImageData = Object.getOwnPropertyDescriptor(globalThis, 'ImageData')
const frame = {
  pixels: new Uint8ClampedArray([1, 2, 3, 255]),
  width: 1,
  height: 1,
}
afterEach(() => {
  for (const [key, descriptor] of [['document', originalDocument], ['ImageData', originalImageData]] as const) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, key)
    }
  }
})
const setup = (contextAvailable = true, dataUrl = 'data:image/png;base64,encoded') => {
  let writtenImage: unknown
  let requestedType: string | undefined
  const canvas = {
    width: 0,
    height: 0,
    getContext: (type: string) => {
      expect(type).toBe('2d')
      return contextAvailable ? {
        putImageData: (image: unknown, x: number, y: number) => {
          expect([x, y]).toEqual([0, 0])
          writtenImage = image
        },
      } : null
    },
    toDataURL: (type: string) => {
      requestedType = type
      return dataUrl
    },
  }
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: (tag: string) => {
        expect(tag).toBe('canvas')
        return canvas
      },
    },
  })
  Object.defineProperty(globalThis, 'ImageData', {
    configurable: true,
    value: class {
      constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
    },
  })
  return {
    canvas,
    get writtenImage() {
      return writtenImage
    },
    get requestedType() {
      return requestedType
    },
  }
}
describe('PNG encoding', () => {
  test('encodes the packed pixels at their native dimensions', () => {
    const state = setup()
    expect(encodePng(frame)).toBe('data:image/png;base64,encoded')
    expect([state.canvas.width, state.canvas.height]).toEqual([1, 1])
    expect(state.writtenImage).toEqual({
      data: frame.pixels,
      width: 1,
      height: 1,
    })
    expect(state.requestedType).toBe('image/png')
  })
  test('explains how to encode without a DOM', () => {
    Reflect.deleteProperty(globalThis, 'document')
    expect(() => encodePng(frame)).toThrow('Provide an encode function')
  })
  test('rejects when a 2D context is unavailable', () => {
    setup(false)
    expect(() => encodePng(frame)).toThrow('Could not create a 2D canvas context')
  })
  test('rejects the browser’s empty data URL for an unsupported canvas size', () => {
    setup(true, 'data:,')
    expect(() => encodePng(frame)).toThrow('could not encode')
  })
  test('propagates browser encoding failures', () => {
    const state = setup()
    state.canvas.toDataURL = () => {
      throw new Error('Encoding failed.')
    }
    expect(() => encodePng(frame)).toThrow('Encoding failed.')
  })
})
