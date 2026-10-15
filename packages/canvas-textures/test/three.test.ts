import {afterEach, beforeEach, expect, mock, test} from 'bun:test'

import {LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace} from 'three/webgpu'

import renderCanvasTexture, {prepareCanvasTexture, textureFromPixels} from '../src/three/main.ts'
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
test('lower resolutions shrink the backing canvas while drawing keeps logical coordinates', () => {
  const draw = mock(() => {})
  const texture = renderCanvasTexture({
    width: 1024,
    height: 246,
    resolution: 0.5,
    mipmaps: false,
    draw,
  })
  expect(texture.image.width).toBe(512)
  expect(texture.image.height).toBe(123)
  expect(fixture.surfaces[0].context.scale).toHaveBeenCalledWith(0.5, 0.5)
  expect(draw).toHaveBeenCalledTimes(1)
  texture.dispose()
  expect(() => renderCanvasTexture({
    width: 4,
    height: 2,
    resolution: 0,
    draw() {},
  })).toThrow(RangeError)
})
test('full resolution leaves the context transform untouched', () => {
  const texture = renderCanvasTexture({
    width: 4,
    height: 2,
    draw() {},
  })
  expect(fixture.surfaces[0].context.scale).not.toHaveBeenCalled()
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
  const pendingController = new AbortController
  const pending = prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: () => gate.promise,
    draw,
  }, pendingController.signal)
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
  const failedPreparationController = new AbortController
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => {
      throw failure
    },
    draw() {},
  }, failedPreparationController.signal)).rejects.toBe(failure)
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('prepared inputs are released after success, cancellation and draw failure', async () => {
  const release = mock(() => {})
  const successController = new AbortController
  const success = await prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'success',
    disposeInputs: release,
    draw() {},
  }, successController.signal)
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
  const failedDrawController = new AbortController
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => 'failed draw',
    disposeInputs: release,
    draw() {
      throw new Error('draw failed')
    },
  }, failedDrawController.signal)).rejects.toThrow('draw failed')
  expect(release).toHaveBeenCalledWith('failed draw')
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
test('input cleanup failure cannot leak an otherwise completed canvas texture', async () => {
  const failedCleanupController = new AbortController
  await expect(prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => {},
    disposeInputs() {
      throw new Error('cleanup failed')
    },
    draw() {},
  }, failedCleanupController.signal)).rejects.toThrow('cleanup failed')
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
test('prepared GPU textures never snapshot canvases or read pixels', async () => {
  const gpuTextureController = new AbortController
  const texture = await prepareCanvasTexture({
    width: 4,
    height: 2,
    prepare: async () => {},
    draw() {},
  }, gpuTextureController.signal)
  expect(texture!.image).toBe(fixture.surfaces[0].canvas as unknown as HTMLCanvasElement)
  expect(fixture.createImageBitmap).not.toHaveBeenCalled()
  expect(fixture.surfaces[0].context.getImageData).not.toHaveBeenCalled()
  expect(texture!.image.width).toBe(4)
  texture!.dispose()
  expect(fixture.surfaces[0].canvas.width).toBe(0)
})
