import {afterEach, describe, expect, test} from 'bun:test'

import encodePng from '../src/encodePng.ts'

const originalOffscreenCanvas = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas')
const originalImageData = Object.getOwnPropertyDescriptor(globalThis, 'ImageData')
const frame = {
  pixels: new Uint8ClampedArray([1, 2, 3, 255]),
  width: 1,
  height: 1,
}
afterEach(() => {
  for (const [key, descriptor] of [['OffscreenCanvas', originalOffscreenCanvas], ['ImageData', originalImageData]] as const) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, key)
    }
  }
})
type Size = {
  height: number
  width: number
}
const setup = (contextAvailable = true, encodedType = 'image/png') => {
  const state = {
    canvas: null as Size | null,
    convert: (type: string) => Promise.resolve(new Blob(['encoded'], {type: type === 'image/png' ? encodedType : type})),
    requestedType: undefined as string | undefined,
    writtenImage: undefined as unknown,
  }
  Object.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    value: class {
      constructor(readonly width: number, readonly height: number) {
        state.canvas = this
      }
      convertToBlob({type}: {type: string}) {
        state.requestedType = type
        return state.convert(type)
      }
      getContext(type: string) {
        expect(type).toBe('2d')
        return contextAvailable ? {
          putImageData: (image: unknown, x: number, y: number) => {
            expect([x, y]).toEqual([0, 0])
            state.writtenImage = image
          },
        } : null
      }
    },
  })
  Object.defineProperty(globalThis, 'ImageData', {
    configurable: true,
    value: class {
      constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
    },
  })
  return state
}
describe('PNG encoding', () => {
  test('encodes the packed pixels at their native dimensions into a PNG blob', async () => {
    const state = setup()
    const image = await encodePng(frame)
    expect(image.type).toBe('image/png')
    expect(await image.text()).toBe('encoded')
    expect([state.canvas?.width, state.canvas?.height]).toEqual([1, 1])
    expect(state.writtenImage).toEqual({
      data: frame.pixels,
      width: 1,
      height: 1,
    })
    expect(state.requestedType).toBe('image/png')
  })
  test('explains how to encode without OffscreenCanvas', async () => {
    Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
    await expect(encodePng(frame)).rejects.toThrow('Provide an encode function')
  })
  test('rejects when a 2D context is unavailable', async () => {
    setup(false)
    await expect(encodePng(frame)).rejects.toThrow('Could not create a 2D canvas context')
  })
  test('rejects a blob of another type', async () => {
    setup(true, '')
    await expect(encodePng(frame)).rejects.toThrow('could not encode')
  })
  test('propagates browser encoding failures', async () => {
    const state = setup()
    state.convert = () => Promise.reject(new Error('Encoding failed.'))
    await expect(encodePng(frame)).rejects.toThrow('Encoding failed.')
  })
})
