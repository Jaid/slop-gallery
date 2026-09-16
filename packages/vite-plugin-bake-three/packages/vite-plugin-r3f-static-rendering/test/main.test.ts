import type {StaticRenderCandidate, StaticRenderFacts} from '../src/analysis.ts'

import {expect, test} from 'bun:test'

import r3fStaticRendering, {canBundle, canInstance, resolveR3fStaticRenderingOptions} from '../src/main.ts'

const facts = (changes: Partial<StaticRenderFacts> = {}): StaticRenderFacts => ({
  structure: true,
  transforms: true,
  geometry: true,
  material: true,
  interactionFree: true,
  imperativeFree: true,
  renderableOnly: true,
  reasons: new Set,
  ...changes,
})
const candidate = (changes: Partial<StaticRenderCandidate> = {}): StaticRenderCandidate => ({
  facts: facts(),
  instanceGroup: {
    count: 4,
    geometryKey: 'geometry',
    materialKey: 'material',
    matricesStatic: true,
  },
  renderBundle: true,
  ...changes,
})
test('creates one build plugin with both optimizations enabled by default', () => {
  expect(r3fStaticRendering()).toMatchObject({
    name: 'r3f-static-rendering',
    apply: 'build',
    enforce: 'pre',
  })
  expect(resolveR3fStaticRenderingOptions()).toEqual({
    staticInstancing: {
      enabled: true,
      minimumCount: 3,
    },
    renderBundles: {
      enabled: true,
      minimumObjects: 4,
    },
  })
})
test('features share the same static-render facts but enforce their own constraints', () => {
  expect(canInstance(candidate())).toBe(true)
  expect(canBundle(candidate())).toBe(true)
  expect(canInstance(candidate({facts: facts({interactionFree: false})}))).toBe(false)
  // BundleGroup itself does not erase per-object picking identity; interaction is an instancing constraint.
  expect(canBundle(candidate({facts: facts({interactionFree: false})}))).toBe(true)
  expect(canBundle(candidate({facts: facts({renderableOnly: false})}))).toBe(false)
  expect(canInstance(candidate({facts: facts({renderableOnly: false})}))).toBe(true)
})
test('each feature can be disabled independently', () => {
  expect(resolveR3fStaticRenderingOptions({
    staticInstancing: false,
    renderBundles: {minimumObjects: 8},
  })).toEqual({
    staticInstancing: false,
    renderBundles: {
      enabled: true,
      minimumObjects: 8,
    },
  })
})
