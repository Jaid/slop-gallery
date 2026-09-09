import {expect, test} from 'bun:test'

import {PerspectiveCamera, Texture} from 'three/webgpu'

import {MarbleFloorMaterial} from '../../src/lib/materials/MarbleFloorMaterial.ts'
import {WoodFloorMaterial} from '../../src/lib/materials/WoodFloorMaterial.ts'
import {getGraphicsProfile} from '../../src/lib/rendering/graphicsQuality.ts'

for (const Material of [MarbleFloorMaterial, WoodFloorMaterial]) {
  test(`${Material.name} allocates filtered, nonrecursive reflections only in quality`, () => {
    const texture = new Texture
    const quality = new Material(texture, getGraphicsProfile(true).floorReflections)
    const performance = new Material(texture, getGraphicsProfile(false).floorReflections)
    try {
      expect(quality.map).toBe(texture)
      expect(quality.envMapIntensity).toBe(1)
      expect(quality.outputNode).not.toBeNull()
      expect(quality.reflection!.reflector.resolutionScale).toBe(0.75)
      expect(quality.reflection!.reflector.generateMipmaps).toBe(true)
      expect(quality.reflection!.reflector.bounces).toBe(false)
      expect(performance.map).toBe(texture)
      expect(performance.envMapIntensity).toBe(0)
      expect(performance.reflection).toBeNull()
      expect(performance.outputNode).toBeNull()
      expect(performance.roughness).toBeGreaterThanOrEqual(0.7)
      expect(performance.metalness).toBe(0)
    } finally {
      quality.dispose()
      performance.dispose()
      texture.dispose()
    }
  })
  test(`${Material.name} releases reflection targets while preserving caller-owned maps`, () => {
    const texture = new Texture
    const material = new Material(texture)
    const target = material.reflection!.reflector.getRenderTarget(new PerspectiveCamera)
    const disposed: Array<string> = []
    target.addEventListener('dispose', () => disposed.push('reflection'))
    material.addEventListener('dispose', () => disposed.push('material'))
    texture.addEventListener('dispose', () => disposed.push('tile'))
    material.dispose()
    expect(disposed).toEqual(['reflection', 'material'])
    texture.dispose()
    expect(disposed).toEqual(['reflection', 'material', 'tile'])
  })
  test(`${Material.name} can repeatedly switch without sharing disposed reflection resources`, () => {
    const texture = new Texture
    const first = new Material(texture, true)
    const reflection = first.reflection
    first.dispose()
    const performance = new Material(texture, false)
    expect(performance.reflection).toBeNull()
    performance.dispose()
    const next = new Material(texture, true)
    expect(next.reflection).not.toBe(reflection)
    expect(next.map).toBe(texture)
    next.dispose()
    texture.dispose()
  })
}
test('quality restores the original polished marble and softer wood varnish', () => {
  const texture = new Texture
  const wood = new WoodFloorMaterial(texture)
  const marble = new MarbleFloorMaterial(texture)
  try {
    expect(wood.roughness).toBe(0.28)
    expect(marble.roughness).toBe(0.12)
    expect(wood.color.getHexString()).toBe('c5a585')
    expect(marble.color.getHexString()).toBe('e8dfd0')
    expect(wood.reflection).not.toBe(marble.reflection)
  } finally {
    wood.dispose()
    marble.dispose()
    texture.dispose()
  }
})
