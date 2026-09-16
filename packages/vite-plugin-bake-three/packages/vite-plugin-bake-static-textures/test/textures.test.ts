import type {Constructors} from 'vite-plugin-bake-core/runtime'

import {afterEach, expect, test} from 'bun:test'
import {resolve} from 'node:path'

import {ImageData as CanvasImageData, createCanvas} from '@napi-rs/canvas'
import * as Three from 'three/webgpu'
import {Recipe, SnapshotWriter, SourceGraph} from 'vite-plugin-bake-core'
import {decodeSnapshot} from 'vite-plugin-bake-core/runtime'

import {renderCanvasTexture} from '../src/canvas.ts'
import {staticTexturesAdapter} from '../src/main.ts'

type ImageTexture = Three.Texture & {image: HTMLCanvasElement}
const constructors = Three as unknown as Constructors
const adapter = staticTexturesAdapter()
const originalGlobals = {
  document: globalThis.document,
  ImageData: globalThis.ImageData,
}
afterEach(() => Object.assign(globalThis, originalGlobals))
function bake(value: unknown) {
  const writer = new SnapshotWriter(adapter, 32 * 1024 * 1024, () => false)
  return decodeSnapshot(writer.write(value), constructors)
}
function canvasDom() {
  Object.assign(globalThis, {
    document: {createElement: () => {
      const canvas = createCanvas(1, 1)
      let width = 1
      let height = 1
      return new Proxy(canvas, {
        get(target, key): unknown {
          if (key === 'width') {
            return width
          }
          if (key === 'height') {
            return height
          }
          const value: unknown = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
        set(target, key, value: unknown) {
          if (key === 'width') {
            width = value as number
          }
          if (key === 'height') {
            height = value as number
          }
          return Reflect.set(target, key, value, target)
        },
      })
    }},
    ImageData: CanvasImageData,
  })
}
test.each([Three.NoColorSpace, Three.SRGBColorSpace])('preserves texture sampling and %s interpretation', colorSpace => {
  const texture = new Three.DataTexture(new Float32Array([0.1, 1, 4, 1, 12.25, 2, 0, 1]), 2, 1, Three.RGBAFormat, Three.FloatType)
  texture.colorSpace = colorSpace
  texture.wrapS = Three.RepeatWrapping
  texture.wrapT = Three.MirroredRepeatWrapping
  texture.minFilter = Three.LinearMipmapLinearFilter
  texture.magFilter = Three.LinearFilter
  texture.anisotropy = 16
  texture.flipY = true
  texture.generateMipmaps = true
  texture.repeat.set(3, 2)
  texture.offset.set(0.1, 0.2)
  texture.center.set(0.5, 0.5)
  texture.rotation = 0.25
  texture.updateMatrix()
  texture.matrixAutoUpdate = false
  const create = bake(texture)
  const result = create() as Three.DataTexture
  expect(result).toBeInstanceOf(Three.DataTexture)
  expect(result.image.data).toEqual(texture.image.data)
  for (const field of ['mapping', 'channel', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'format', 'type', 'colorSpace', 'flipY', 'premultiplyAlpha', 'unpackAlignment', 'generateMipmaps', 'matrixAutoUpdate'] as const) {
    expect(result[field]).toBe(texture[field])
  }
  expect(result.matrix).toEqual(texture.matrix)
  expect(result.repeat).toEqual(texture.repeat)
  expect(result.offset).toEqual(texture.offset)
  expect(result.version).toBeGreaterThan(0)
  expect(result.uuid).not.toBe(texture.uuid)
  expect(result.source.uuid).not.toBe(texture.source.uuid)
})
test('does not quantize half-float/data channels or turn data textures into color images', () => {
  const texture = new Three.DataTexture(new Uint16Array([0x3C_00, 0x40_00, 0x42_00, 0x3C_00]), 1, 1, Three.RGBAFormat, Three.HalfFloatType)
  const result = bake(texture)() as Three.DataTexture
  expect(result.image.data).toEqual(texture.image.data)
  expect(result.type).toBe(Three.HalfFloatType)
  expect(result.colorSpace).toBe(Three.NoColorSpace)
  expect(result.flipY).toBe(false)
})
test('keeps texture/source aliases within a result and isolates separate mounts', () => {
  const texture = new Three.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1)
  const clone = texture.clone()
  const create = bake({
    texture,
    clone,
    again: texture,
  })
  const first = create() as {
    again: Three.DataTexture
    clone: Three.DataTexture
    texture: Three.DataTexture
  }
  const second = create() as typeof first
  expect(first.texture).toBe(first.again)
  expect(first.texture.source).toBe(first.clone.source)
  expect(first.texture.source).not.toBe(second.texture.source)
  first.texture.image.data![0] = 9
  expect(second.texture.image.data![0]).toBe(1)
})
test('restores canvas-backed textures with matching pixels and independent disposal', () => {
  const texture = renderCanvasTexture({width: 32, height: 16, mipmaps: false, draw(context) {
    context.fillStyle = '#734129'
    context.fillRect(0, 0, 32, 16)
    context.fillStyle = 'rgba(220, 140, 80, 0.5)'
    context.fillRect(3, 4, 8, 6)
  }})
  const expected = texture.image.getContext('2d')!.getImageData(0, 0, 32, 16).data
  const create = bake(texture)
  canvasDom()
  const first = create() as ImageTexture
  const second = create() as ImageTexture
  expect(first.isTexture).toBe(true)
  expect('isDataTexture' in first && first.isDataTexture).not.toBe(true)
  expect(first.image).not.toBe(second.image)
  expect(first.image.getContext('2d')!.getImageData(0, 0, 32, 16).data).toEqual(expected)
  expect(first.flipY).toBe(true)
  expect(first.colorSpace).toBe(Three.SRGBColorSpace)
  expect(first.generateMipmaps).toBe(false)
  first.dispose()
  expect(first.image.width).toBe(0)
  expect(second.image.width).toBe(32)
})
test('automatically discovers canvas-textures through aliased imports', async () => {
  const graph = new SourceGraph(async () => {})
  const source = await graph.input(resolve('canvas.ts'), `
    import raster from 'canvas-textures/three'
    const result = raster({width: 16, height: 8, draw(context) {
      let seed = 7
      const random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296
      context.fillStyle = '#723122'
      context.fillRect(0, 0, 16, 8)
      for (let i = 0; i < 100; i++) context.fillRect(random() * 16, random() * 8, 1, 1)
    }})
  `)
  const path = source.path.scope.getBinding('result')!.path.get('init')
  if (Array.isArray(path) || !path.isCallExpression()) { throw new Error('Expected call initializer') }
  const evaluated = await new Recipe(graph, adapter).evaluate(path, 1000)
  const writer = new SnapshotWriter(adapter, 1024 * 1024, evaluated.isShared)
  const bytes = writer.write(evaluated.value)
  canvasDom()
  const restored = decodeSnapshot(bytes, constructors)() as ImageTexture
  expect(restored.image.width).toBe(16)
  expect(restored.image.height).toBe(8)
})
test('leaves font-dependent rasterization at runtime', () => {
  expect(() => renderCanvasTexture({
    width: 16,
    height: 8,
    draw(context) {
      context.fillText('text', 0, 0)
    },
  })).toThrow('Font/image-dependent')
})
test('a cloned canvas texture does not acquire ownership of the original canvas', () => {
  const original = renderCanvasTexture({
    width: 8,
    height: 8,
    draw(context) {
      context.fillRect(0, 0, 8, 8)
    },
  })
  const create = bake({
    original,
    clone: original.clone(),
  })
  canvasDom()
  const restored = create() as {
    clone: ImageTexture
    original: ImageTexture
  }
  expect(restored.original.source).toBe(restored.clone.source)
  restored.clone.dispose()
  expect(restored.original.image.width).toBe(8)
  restored.original.dispose()
  expect(restored.original.image.width).toBe(0)
})
