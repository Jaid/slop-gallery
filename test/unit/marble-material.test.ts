import {expect, test} from 'bun:test'
import {PerspectiveCamera, Texture} from 'three/webgpu'

import {MarbleFloorMaterial} from '../../src/lib/materials/MarbleFloorMaterial.ts'
import {WoodFloorMaterial} from '../../src/lib/materials/WoodFloorMaterial.ts'

test('polished marble uses a filtered, nonrecursive planar reflection', () => {
  const texture = new Texture
  const material = new MarbleFloorMaterial(texture)
  try {
    expect(material.map).toBe(texture)
    expect(material.metalness).toBe(0)
    expect(material.roughness).toBe(0.12)
    expect(material.outputNode).not.toBeNull()
    expect(material.reflection.reflector.resolutionScale).toBe(0.75)
    expect(material.reflection.reflector.generateMipmaps).toBe(true)
    expect(material.reflection.reflector.bounces).toBe(false)
  } finally {
    material.dispose()
    texture.dispose()
  }
})

test('disposing marble releases reflection targets but leaves the caller-owned tile map alone', () => {
  const texture = new Texture
  const material = new MarbleFloorMaterial(texture)
  const target = material.reflection.reflector.getRenderTarget(new PerspectiveCamera)
  const disposed: Array<string> = []
  target.addEventListener('dispose', () => disposed.push('reflection'))
  material.addEventListener('dispose', () => disposed.push('material'))
  texture.addEventListener('dispose', () => disposed.push('tile'))
  material.dispose()
  expect(disposed).toEqual(['reflection', 'material'])
  texture.dispose()
  expect(disposed).toEqual(['reflection', 'material', 'tile'])
})

test('wood varnish keeps its own softer finish and reflection resources', () => {
  const texture = new Texture
  const wood = new WoodFloorMaterial(texture)
  const marble = new MarbleFloorMaterial(texture)
  try {
    expect(wood.roughness).toBe(0.28)
    expect(wood.roughness).toBeGreaterThan(marble.roughness)
    expect(wood.color.getHexString()).toBe('c5a585')
    expect(wood.map).toBe(texture)
    expect(wood.reflection).not.toBe(marble.reflection)
    expect(wood.reflection.target).not.toBe(marble.reflection.target)
    expect(wood.reflection.reflector.bounces).toBe(false)
  } finally {
    wood.dispose()
    marble.dispose()
    texture.dispose()
  }
})
