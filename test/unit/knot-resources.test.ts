import {expect, test} from 'bun:test'

import {knotsById} from '../../src/lib/knots/index.ts'
import KnotResources from '../../src/lib/knots/KnotResources.ts'

test('shares geometry by displacement bound and keeps collider and culling bounds expanded', () => {
  const base = knotsById.get('astra/lenticular_mirage')!
  const relief = knotsById.get('astra/coralline_crown')!
  const resources = new KnotResources([
    base,
    {
      ...base,
      id: 'second',
    },
    relief,
    {
      ...relief,
      id: 'another_relief',
    },
  ])
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
  } finally {
    resources.dispose()
  }
})
test('disposes each shared geometry resource once', () => {
  const base = knotsById.get('astra/lenticular_mirage')!
  const relief = knotsById.get('astra/coralline_crown')!
  const resources = new KnotResources([
    base,
    {
      ...base,
      id: 'second',
    },
    relief,
    {
      ...relief,
      id: 'another_relief',
    },
  ])
  const geometries = new Set(resources.items.map(item => item.geometry))
  let disposals = 0
  for (const geometry of geometries) {
    geometry.addEventListener('dispose', () => disposals++)
  }
  resources.dispose()
  expect(disposals).toBe(geometries.size)
})
