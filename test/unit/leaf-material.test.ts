import {expect, test} from 'bun:test'

import decorationResources from '../../src/lib/gallery/plantDecorations/DecorationResources.ts'
import LeafMaterial from '../../src/lib/materials/LeafMaterial.ts'

test('bladed plants share the veined leaves, the jade keeps its plain succulent finish', () => {
  const resources = decorationResources()
  expect(resources.foliage).toBeInstanceOf(LeafMaterial)
  expect(resources.waxyFoliage).toBeInstanceOf(LeafMaterial)
  expect(resources.succulent).not.toBeInstanceOf(LeafMaterial)
  expect(resources.succulent.vertexColors).toBe(true)
})
