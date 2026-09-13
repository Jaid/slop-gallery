import {afterEach, beforeEach, expect, mock, test} from 'bun:test'

import {LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace} from 'three/webgpu'

import renderCanvasTexture, {prepareCanvasTexture, renderCanvasBitmapTexture, textureFromPixels} from '../src/three/main.ts'
import {canvasFixture} from './canvasFixture.ts'

let fixture: ReturnType<typeof canvasFixture>
beforeEach(() => {
  fixture = canvasFixture()
})
afterEach(() => fixture.restore())
test('artwork and surface defaults retain mipmaps, color space, orientation and anisotropy', () => {
  const texture = renderCanvasTexture({
    width: 4,
    height: 2,
    name: 'art',
    draw() {},
  })
  expect(texture.image).toBe(fixture.surfaces[0].canvas as unknown as HTMLCanvasElement)
  expect(fixture.surfaces[0].canvas.getContext).toHaveBeenCalledWith('2d', {
    willReadFrequently: false,
    colorSpace: 'srgb',
  })
  expect(fixture.surfaces[0].context.getImageData).not.toHaveBeenCalled()
  expect(texture.name).toBe('art')
  expect(texture.colorSpace).toBe(SRGBColorSpace)
  expect(texture.flipY).toBe(true)
  expect(texture.generateMipmaps).toBe(true)
  expect(texture.minFilter).toBe(LinearMipmapLinearFilter)
  expect(texture.magFilter).toBe(LinearFilter)
  expect(texture.anisotropy).toBe(16)
  expect(texture.version).toBe(1)
  texture.dispose()
})
test('signage explicitly disables mip generation with consistent linear filtering', () => {
  const texture = renderCanvasTexture({
    width: 4,
    height: 2,
    mipmaps: false,
    draw() {},
  })
  expect(texture.generateMipmaps).toBe(false)
  expect(texture.minFilter).toBe(LinearFilter)
  expect(texture.magFilter).toBe(LinearFilter)
  expect(texture.anisotropy).toBe(1)
  expect(texture.version).toBe(1)
  texture.dispose()
})
test('raw bump maps retain non-color interpretation and caller-owned buffers without copying', () => {
  const data = new Uint8Array(32)
  const texture = textureFromPixels({
    data,
    width: 4,
    height: 2,
  }, {
    color: false,
    anisotropy: 8,
  })
  expect(texture.image.data).toBe(data)
  expect(texture.colorSpace).toBe(NoColorSpace)
  expect(texture.anisotropy).toBe(8)
  expect(fixture.createElement).not.toHaveBeenCalled()
  texture.dispose()
})
test('malformed pixel lengths cannot produce invalid GPU uploads', () => {
  expect(() => textureFromPixels({
    data: new Uint8Array(31),
    width: 4,
    height: 2,
  })).toThrow(RangeError)
})
test('async recipes allocate and rasterize only once, after all inputs resolve', async () => {
  const gate = Promise.withResolvers<string>()
  const draw = mock(() => {})
  const pending = prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: () => gate.promise,
    draw,
  }, (new AbortController).signal)
  expect(fixture.createElement).not.toHaveBeenCalled()
  gate.resolve('final icon')
  const texture = await pending
  expect(texture).not.toBeNull()
  expect(draw).toHaveBeenCalledTimes(1)
  expect(draw).toHaveBeenCalledWith(fixture.surfaces[0].context, 'final icon')
  expect(fixture.createElement).toHaveBeenCalledTimes(1)
  expect(fixture.surfaces[0].context.getImageData).not.toHaveBeenCalled()
  expect(texture!.version).toBe(1)
  texture!.dispose()
})
test('aborting before preparation never invokes a loader', async () => {
  const controller = new AbortController
  controller.abort()
  const prepare = mock(async () => {})
  expect(await prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare,
    draw() {},
  }, controller.signal)).toBeNull()
  expect(prepare).not.toHaveBeenCalled()
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('late results after cancellation never allocate pixels or GPU textures', async () => {
  for (const rejects of [false, true]) {
    const controller = new AbortController
    const gate = Promise.withResolvers<void>()
    const draw = mock(() => {})
    const pending = prepareCanvasTexture({
      width: 4,
      height: 2,
      prepare: () => gate.promise,
      draw,
    }, controller.signal)
    controller.abort()
    if (rejects) {
      gate.reject(new Error('cancelled fetch'))
    } else {
      gate.resolve()
    }
    expect(await pending).toBeNull()
    expect(draw).not.toHaveBeenCalled()
  }
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('real preparation failures propagate without allocating a placeholder', async () => {
  const failure = new Error('icon failed')
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => {
      throw failure
    },
    draw() {},
  }, (new AbortController).signal)).rejects.toBe(failure)
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('prepared inputs are released after success, cancellation and draw failure', async () => {
  const release = mock(() => {})
  const success = await prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'success',
    disposeInputs: release,
    draw() {},
  }, (new AbortController).signal)
  expect(release).toHaveBeenCalledWith('success')
  success!.dispose()
  const controller = new AbortController
  const gate = Promise.withResolvers<string>()
  const cancelled = prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: () => gate.promise,
    disposeInputs: release,
    draw() {},
  }, controller.signal)
  controller.abort()
  gate.resolve('cancelled')
  expect(await cancelled).toBeNull()
  expect(release).toHaveBeenCalledWith('cancelled')
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'failed draw',
    disposeInputs: release,
    draw() {
      throw new Error('draw failed')
    },
  }, (new AbortController).signal)).rejects.toThrow('draw failed')
  expect(release).toHaveBeenCalledWith('failed draw')
})
test('bitmap textures never read pixels and retain their snapshot until idempotent disposal', async () => {
  const texture = await renderCanvasBitmapTexture({
    width: 4,
    height: 2,
    color: false,
    mipmaps: false,
    draw() {},
  })
  expect(texture).not.toHaveProperty('isDataTexture')
  expect(texture.image).toBe(fixture.bitmaps[0] as ImageBitmap)
  expect(texture.colorSpace).toBe(NoColorSpace)
  expect(texture.flipY).toBe(true)
  expect(texture.premultiplyAlpha).toBe(false)
  expect(fixture.createImageBitmap).toHaveBeenCalledWith(fixture.surfaces[0].canvas, {
    imageOrientation: 'none',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  })
  expect(fixture.surfaces[0].context.getImageData).not.toHaveBeenCalled()
  expect(fixture.surfaces[0].canvas.width).toBe(0)
  expect(fixture.bitmaps[0].close).not.toHaveBeenCalled()
  texture.dispose()
  texture.dispose()
  expect(fixture.bitmaps[0].close).toHaveBeenCalledTimes(1)
})
test('cancellation during bitmap creation closes the late bitmap and releases prepared inputs', async () => {
  const gate = Promise.withResolvers<ImageBitmap>()
  fixture.createImageBitmap.mockImplementationOnce(() => gate.promise)
  const close = mock(() => {})
  const release = mock(() => {})
  const controller = new AbortController
  const pending = prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'input',
    disposeInputs: release,
    draw() {},
  }, controller.signal)
  await Promise.resolve()
  expect(fixture.createImageBitmap).toHaveBeenCalledTimes(1)
  expect(fixture.surfaces[0].canvas.width).toBe(4)
  controller.abort()
  gate.resolve({
    width: 4,
    height: 2,
    close,
  })
  expect(await pending).toBeNull()
  expect(close).toHaveBeenCalledTimes(1)
  expect(release).toHaveBeenCalledWith('input')
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
test('snapshot failures release canvas storage and inputs', async () => {
  fixture.createImageBitmap.mockImplementationOnce(async () => {
    throw new Error('snapshot failed')
  })
  const release = mock(() => {})
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'input',
    disposeInputs: release,
    draw() {},
  }, (new AbortController).signal)).rejects.toThrow('snapshot failed')
  expect(release).toHaveBeenCalledWith('input')
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
test('external-image draw failures and resized surfaces release their canvases without readback', () => {
  for (const resize of [false, true]) {
    expect(() => renderCanvasTexture({
      width: 4,
      height: 2,
      draw(context) {
        if (resize) {
          context.canvas.width = 8
        } else {
          throw new Error('draw failed')
        }
      },
    })).toThrow(resize ? 'resize' : 'draw failed')
    expect(fixture.surfaces.at(-1)!.canvas.width).toBe(0)
    expect(fixture.surfaces.at(-1)!.context.getImageData).not.toHaveBeenCalled()
  }
})
test('synchronous external images retain canvas storage until texture disposal', () => {
  const texture = renderCanvasTexture({
    width: 4,
    height: 2,
    draw() {},
  })
  expect(fixture.surfaces[0].canvas.width).toBe(4)
  expect(texture).not.toHaveProperty('isDataTexture')
  texture.dispose()
  texture.dispose()
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
test('cancelled bitmap failures return null and release prepared inputs', async () => {
  const gate = Promise.withResolvers<ImageBitmap>()
  fixture.createImageBitmap.mockImplementationOnce(() => gate.promise)
  const controller = new AbortController
  const release = mock(() => {})
  const pending = prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'input',
    disposeInputs: release,
    draw() {},
  }, controller.signal)
  await Promise.resolve()
  controller.abort()
  gate.reject(new Error('snapshot cancelled'))
  expect(await pending).toBeNull()
  expect(release).toHaveBeenCalledWith('input')
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
test('input cleanup failure cannot leak an otherwise completed bitmap texture', async () => {
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => {},
    disposeInputs() {
      throw new Error('cleanup failed')
    },
    draw() {},
  }, (new AbortController).signal)).rejects.toThrow('cleanup failed')
  expect(fixture.bitmaps[0].close).toHaveBeenCalledTimes(1)
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
