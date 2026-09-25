import {expect, test} from 'bun:test'
import {resolve} from 'node:path'

import Recipe from '../src/Recipe.ts'
import SourceGraph from '../src/SourceGraph.ts'
import {threeAdapter} from '../src/three.ts'

const adapter = threeAdapter({
  name: 'three-test',
  kind: 'geometry',
})
const graph = new SourceGraph(async () => {})
async function evaluate(code: string, allowFreezingRandomness = false) {
  const source = await graph.input(resolve('three-randomness.ts'), code)
  const init = source.path.scope.getBinding('result')!.path.get('init')
  if (Array.isArray(init) || !init.isExpression()) {
    throw new Error('Expected result expression.')
  }
  const recipe = new Recipe(graph, adapter, allowFreezingRandomness)
  return recipe.evaluateValue(init, 1000, init.node)
}
test('Three SimplexNoise remains deterministic by default when given an explicit RNG', async () => {
  const code = `
    import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'
    const result = (() => {
      let state = 7
      const random = () => (state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296
      return new SimplexNoise({random}).noise(0.25, -0.75)
    })()
  `
  const first = await evaluate(code)
  const second = await evaluate(code)
  expect(first.value).toBe(second.value)
})
test('Three SimplexNoise default randomness follows allowFreezingRandomness', async () => {
  const code = `
    import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'
    const result = new SimplexNoise().noise(0.25, -0.75)
  `
  let rejection: unknown
  try {
    await evaluate(code)
  } catch (error) {
    rejection = error
  }
  expect(String(rejection)).toContain('explicit deterministic random source')
  const evaluated = await evaluate(code, true)
  expect(evaluated.value).toBeNumber()
  expect(Number.isFinite(evaluated.value)).toBe(true)
})
