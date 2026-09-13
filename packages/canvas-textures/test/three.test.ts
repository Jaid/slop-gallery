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
  expect(texture.image.data!.buffer).toBe(fixture.surfaces[0].pixels().buffer)
  expect(texture.image.data!.byteOffset).toBe(8)
  expect(texture.image.data!.byteLength).toBe(32)
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
  expect(fixture.surfaces[0].context.getImageData).toHaveBeenCalledTimes(1)
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
