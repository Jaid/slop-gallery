import {expect, test} from 'bun:test'

import {Texture} from 'three/webgpu'

import FloorMaterial from '../../src/lib/materials/FloorMaterial.ts'

test('floor reflections use native resolution and preserve roughness mipmaps', () => {
  const map = new Texture
  const material = new FloorMaterial(map, {
    color: '#ffffff',
    roughness: 0.2,
    reflection: {
      blur: 2,
      grazingStrength: 0.4,
      strength: 0.3,
    },
  })
  try {
    expect(material.reflection?.reflector.resolutionScale).toBe(1)
    expect(material.reflection?.reflector.generateMipmaps).toBe(true)
    expect(material.reflection?.reflector.bounces).toBe(false)
    expect(material.outputNode).not.toBeNull()
  } finally {
    material.dispose()
    map.dispose()
  }
})
