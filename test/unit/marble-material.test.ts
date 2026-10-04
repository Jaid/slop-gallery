import {expect, test} from 'bun:test'

import {PerspectiveCamera, Texture} from 'three/webgpu'

import ArchitecturalPlasterMaterial from '../../src/lib/materials/ArchitecturalPlasterMaterial.ts'
import DetailedMarbleFloorMaterial from '../../src/lib/materials/DetailedMarbleFloorMaterial.ts'
import MarbleFloorMaterial from '../../src/lib/materials/MarbleFloorMaterial.ts'
import WoodFloorMaterial from '../../src/lib/materials/WoodFloorMaterial.ts'
import {getGraphicsProfile} from '../../src/lib/rendering/graphicsMode.ts'

for (const Material of [MarbleFloorMaterial, WoodFloorMaterial]) {
  test(`${Material.name} allocates filtered, nonrecursive reflections only in heavy`, () => {
    const texture = new Texture
    const heavy = new Material(texture, getGraphicsProfile(true).floorReflections)
    const fast = new Material(texture, getGraphicsProfile(false).floorReflections)
    try {
      expect(heavy.map).toBe(texture)
      expect(heavy.envMapIntensity).toBe(1)
      expect(heavy.outputNode).not.toBeNull()
      expect(heavy.reflection!.reflector.resolutionScale).toBe(1.5)
      expect(heavy.reflection!.reflector.generateMipmaps).toBe(true)
      expect(heavy.reflection!.reflector.bounces).toBe(false)
      expect(fast.map).toBe(texture)
      expect(fast.envMapIntensity).toBe(0)
      expect(fast.reflection).toBeNull()
      expect(fast.outputNode).toBeNull()
      expect(fast.roughness).toBeGreaterThanOrEqual(0.7)
      expect(fast.metalness).toBe(0)
    } finally {
      heavy.dispose()
      fast.dispose()
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
    const fast = new Material(texture, false)
    expect(fast.reflection).toBeNull()
    fast.dispose()
    const next = new Material(texture, true)
    expect(next.reflection).not.toBe(reflection)
    expect(next.map).toBe(texture)
    next.dispose()
    texture.dispose()
  })
}
test('heavy restores the original polished marble and softer wood varnish', () => {
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
test('detailed marble varies polish and reflection blur only when reflections are active', () => {
  const texture = new Texture
  const heavy = new DetailedMarbleFloorMaterial(texture, true)
  const fast = new DetailedMarbleFloorMaterial(texture, false)
  try {
    expect(heavy.reflection).not.toBeNull()
    expect(heavy.roughnessNode).not.toBeNull()
    expect(heavy.outputNode).not.toBeNull()
    expect(fast.reflection).toBeNull()
    expect(fast.roughnessNode).toBeNull()
    expect(fast.roughness).toBe(0.8)
  } finally {
    heavy.dispose()
    fast.dispose()
    texture.dispose()
  }
})
test('architectural plaster adds procedural color, roughness and relief only in heavy', () => {
  const texture = new Texture
  const heavy = new ArchitecturalPlasterMaterial({
    baseColor: '#658578',
    map: texture,
    heavy: true,
    roughness: 0.9,
  })
  const fast = new ArchitecturalPlasterMaterial({
    baseColor: '#658578',
    map: texture,
    heavy: false,
    roughness: 0.9,
  })
  try {
    expect(heavy.map).toBeNull()
    expect(heavy.colorNode).not.toBeNull()
    expect(heavy.roughnessNode).not.toBeNull()
    expect(heavy.normalNode).not.toBeNull()
    expect(fast.map).toBe(texture)
    expect(fast.colorNode).toBeNull()
    expect(fast.roughnessNode).toBeNull()
    expect(fast.normalNode).toBeNull()
  } finally {
    heavy.dispose()
    fast.dispose()
    texture.dispose()
  }
})
