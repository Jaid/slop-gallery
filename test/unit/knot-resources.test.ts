import type {Texture} from 'three/webgpu'

import {expect, test} from 'bun:test'

import {KnotMaterial} from '../../src/lib/knots/base/KnotMaterial.ts'
import {knotsByNumber} from '../../src/lib/knots/index.ts'
import {KnotResources} from '../../src/lib/knots/KnotResources.ts'

class TestMaterial extends KnotMaterial {}
test('shares geometry by displacement bound and keeps collider and culling bounds expanded', () => {
  const base = knotsByNumber.get(6)!
  const relief = knotsByNumber.get(97)!
  const resources = new KnotResources([
    base, {
      ...base,
      id: 'second',
    }, relief, {
      ...relief,
      id: 'another_relief',
    },
  ], [TestMaterial, TestMaterial, TestMaterial, TestMaterial])
  const [a, b, c, d] = resources.items
  try {
    expect(a.geometry).toBe(b.geometry)
    expect(c.geometry).toBe(d.geometry)
    expect(a.geometry).not.toBe(c.geometry)
    expect(a.geometry.getAttribute('position').array).toEqual(c.geometry.getAttribute('position').array)
    expect(c.geometry.boundingSphere!.radius - a.geometry.boundingSphere!.radius).toBeCloseTo(relief.displacement!, 8)
    for (let axis = 0; axis < 3; axis++) {
      expect(c.colliderArgs[axis] - a.colliderArgs[axis]).toBeCloseTo(relief.displacement!, 8)
    }
    expect(c.colliderPosition).toEqual(a.colliderPosition)
    expect(c.material.name).toBe(relief.id)
    expect(c.material.envMap).toBe(resources.environment)
  } finally {
    resources.dispose()
  }
})
test('disposes shared GPU resources once and cleans up after partial construction failures', () => {
  const entry = knotsByNumber.get(6)!
  let materialDisposals = 0
  let environmentDisposals = 0
  class Tracked extends KnotMaterial {
    constructor(environment: Texture) {
      super(environment)
      this.addEventListener('dispose', () => materialDisposals++)
      environment.addEventListener('dispose', () => environmentDisposals++)
    }
  }
  class Broken extends KnotMaterial {
    constructor(environment: Texture) {
      super(environment); throw new Error('Broken shader.')
    }
  }
  expect(() => new KnotResources([entry, entry], [Tracked, Broken])).toThrow('Broken shader')
  expect(materialDisposals).toBe(1)
  expect(environmentDisposals).toBe(1)
  expect(() => new KnotResources([entry], [])).toThrow('constructor')
})
