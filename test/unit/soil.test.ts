import {expect, test} from 'bun:test'

import {NoColorSpace, SRGBColorSpace} from 'three/webgpu'

import {SoilTextures} from '../../src/lib/materials/SoilTextures.ts'

test('soil has deterministic brown grains and matching relief with owned resources', () => {
  const a = new SoilTextures
  const b = new SoilTextures
  const disposed: Array<string> = []
  try {
    expect(a.map.colorSpace).toBe(SRGBColorSpace)
    expect(a.bumpMap.colorSpace).toBe(NoColorSpace)
    for (const key of ['map', 'bumpMap'] as const) {
      expect(a[key].image.data).not.toBe(b[key].image.data)
      expect(a[key].image.data).toEqual(b[key].image.data)
      expect(a[key].generateMipmaps).toBe(true)
      expect(a[key].repeat.toArray()).toEqual([1, 1])
      a[key].addEventListener('dispose', () => disposed.push(key))
    }
    const color = a.map.image.data!
    const bump = a.bumpMap.image.data!
    const shades = new Set<number>
    const relief = new Set<number>
    for (let i = 0; i < color.length; i += 4) {
      shades.add(color[i])
      relief.add(bump[i])
      if (!(color[i] > color[i + 1] && color[i + 1] > color[i + 2] && color[i + 3] === 255 && bump[i + 3] === 255)) {
        throw new Error('Expected opaque brown soil.')
      }
    }
    expect(shades.size).toBeGreaterThan(50)
    expect(relief.size).toBeGreaterThan(60)
  } finally {
    a.dispose()
    b.dispose()
  }
  expect(disposed).toEqual(['map', 'bumpMap'])
})
