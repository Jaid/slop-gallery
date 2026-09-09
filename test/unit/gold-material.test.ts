import {describe, expect, test} from 'bun:test'

import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'
import {DataUtils, NoColorSpace, RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

import {GoldTextures} from '../../src/lib/materials/GoldTextures.ts'

describe('polished gold', () => {
  test('generates deterministic, independently owned color and normal maps', () => {
    const a = new GoldTextures
    const b = new GoldTextures
    try {
      expect(a.map).not.toBe(b.map)
      expect(a.map.image.data).not.toBe(b.map.image.data)
      expect(a.map.image.data).toEqual(b.map.image.data)
      expect(a.normal.image.data).toEqual(b.normal.image.data)
      expect(a.map.colorSpace).toBe(SRGBColorSpace)
      expect(a.normal.colorSpace).toBe(NoColorSpace)
      expect(a.map.repeat.toArray()).toEqual(a.normal.repeat.toArray())
      for (const texture of [a.map, a.normal]) {
        expect(texture.wrapS).toBe(RepeatWrapping)
        expect(texture.wrapT).toBe(RepeatWrapping)
        expect(texture.generateMipmaps).toBe(true)
      }
      const color = a.map.image.data
      const normal = a.normal.image.data
      if (!color || !normal) {
        throw new Error('Missing gold pixels.')
      }
      let minimumRed = 255
      let maximumRed = 0
      let variedNormals = false
      for (let i = 0; i < color.length; i += 4) {
        minimumRed = Math.min(minimumRed, color[i]!)
        maximumRed = Math.max(maximumRed, color[i]!)
        if (normal[i] !== 128 || normal[i + 1] !== 128) {
          variedNormals = true
        }
        if (!(color[i]! > color[i + 1]! && color[i + 1]! > color[i + 2]! && color[i + 3] === 255)) {
          throw new Error('Invalid gold color.')
        }
        const length = Math.hypot(normal[i]! / 255 * 2 - 1, normal[i + 1]! / 255 * 2 - 1, normal[i + 2]! / 255 * 2 - 1)
        if (Math.abs(length - 1) > 0.015 || normal[i + 2]! < 230 || normal[i + 3] !== 255) {
          throw new Error('Invalid surface normal.')
        }
      }
      expect(maximumRed - minimumRed).toBeGreaterThan(10)
      expect(variedNormals).toBe(true)
    } finally {
      a.dispose()
      b.dispose()
    }
  })
  test('releases both owned textures', () => {
    const textures = new GoldTextures
    const disposed: Array<string> = []
    textures.map.addEventListener('dispose', () => disposed.push('color'))
    textures.normal.addEventListener('dispose', () => disposed.push('normal'))
    textures.dispose()
    expect(disposed).toEqual(['color', 'normal'])
  })
  test('the bundled reflection environment contains finite HDR lighting', async () => {
    const bytes = await Bun.file(new URL('../../public/environment/warehouse.hdr', import.meta.url)).arrayBuffer()
    const hdr = (new HDRLoader).parse(bytes)
    expect(hdr.width).toBe(1024)
    expect(hdr.height).toBe(512)
    if (!hdr.data) {
      throw new Error('Missing HDR pixels.')
    }
    let maximum = 0
    for (let i = 0; i < hdr.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        const value = DataUtils.fromHalfFloat(hdr.data[i + channel]!)
        if (!Number.isFinite(value) || value < 0) {
          throw new Error('Invalid HDR radiance.')
        }
        maximum = Math.max(maximum, value)
      }
    }
    expect(maximum).toBeGreaterThan(1)
  })
})
