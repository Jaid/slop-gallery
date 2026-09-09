import {expect, test} from 'bun:test'

import {decorationResources} from '../../src/lib/gallery/plantDecorations/DecorationResources.ts'
import {PotMaterials} from '../../src/lib/materials/PotMaterials.ts'
import {getGraphicsProfile} from '../../src/lib/rendering/graphicsQuality.ts'

test('performance pots and soil have warm, matte colors without noise maps', () => {
  const materials = new PotMaterials(getGraphicsProfile(false).noiseTextures)
  try {
    expect(materials.shells.atelier.color.getHexString()).toBe('b47249')
    expect(materials.shells.atelier.roughness).toBe(0.87)
    expect(materials.soil.color.getHexString()).toBe('362416')
    expect(materials.soil.roughness).toBe(1)
    for (const material of [...Object.values(materials.shells), materials.soil]) {
      expect(material.map).toBeNull()
      expect(material.bumpMap).toBeNull()
      expect(material.normalMap).toBeNull()
      expect(material.roughnessMap).toBeNull()
    }
  } finally {
    materials.dispose()
  }
})
test('quality pots restore clay color, relief and roughness maps and detailed soil', () => {
  const materials = new PotMaterials(getGraphicsProfile(true).noiseTextures)
  try {
    const clay = materials.shells.atelier
    expect(clay.map).not.toBeNull()
    expect(clay.bumpMap).not.toBeNull()
    expect(clay.roughnessMap).not.toBeNull()
    expect(clay.bumpScale).toBe(0.008)
    expect(materials.soil.map).not.toBeNull()
    expect(materials.soil.bumpMap).not.toBeNull()
    expect(materials.soil.bumpScale).toBe(0.022)
    // Textured colors are not tinted a second time by the performance base color.
    expect(clay.color.getHexString()).toBe('ffffff')
    expect(materials.soil.color.getHexString()).toBe('ffffff')
  } finally {
    materials.dispose()
  }
})
test('switching finishes reuses shared geometry and caches independent material variants', () => {
  const resources = decorationResources()
  const pot = resources.pot('atelier')
  const performance = resources.potMaterials(false)
  const quality = resources.potMaterials(true)
  expect(performance).not.toBe(quality)
  expect(resources.potMaterials(false)).toBe(performance)
  expect(resources.potMaterials(true)).toBe(quality)
  expect(resources.pot('atelier')).toBe(pot)
  expect(performance.soil.map).toBeNull()
  expect(quality.soil.map).not.toBeNull()
})
test('each finish set releases exactly its own materials and textures', () => {
  for (const noiseTextures of [false, true]) {
    const materials = new PotMaterials(noiseTextures)
    let disposedMaterials = 0
    let disposedTextures = 0
    for (const material of [...Object.values(materials.shells), materials.soil]) {
      material.addEventListener('dispose', () => {
        disposedMaterials++
      })
      for (const texture of [material.map, material.bumpMap, material.roughnessMap]) {
        texture?.addEventListener('dispose', () => {
          disposedTextures++
        })
      }
    }
    materials.dispose()
    expect(disposedMaterials).toBe(5)
    expect(disposedTextures).toBe(noiseTextures ? 5 : 0)
  }
})
