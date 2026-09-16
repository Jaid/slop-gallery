import {expect, test} from 'bun:test'

import bakeThree, {bakeStaticTextures, bakeThreeGeometry, r3fStaticRendering} from '../src/main.ts'

const pluginName = (plugin: ReturnType<typeof bakeThree>[number]) => {
  if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) {
    throw new TypeError('Expected a concrete Vite plugin.')
  }
  return plugin.name
}
test('combines the Three baking passes in dependency order', () => {
  expect(bakeThree().map(pluginName)).toEqual([
    'bake-three-geometry',
    'bake-static-textures',
    'r3f-static-rendering',
  ])
})
test('passes options through and can disable individual passes', () => {
  expect(bakeThree({
    geometry: false,
    staticTextures: false,
    staticRendering: {report: false},
  }).map(pluginName)).toEqual(['r3f-static-rendering'])
})
test('re-exports individual plugin factories', () => {
  expect(bakeThreeGeometry).toBeFunction()
  expect(bakeStaticTextures).toBeFunction()
  expect(r3fStaticRendering).toBeFunction()
})
