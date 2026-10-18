import type {NodeMaterial} from 'three/webgpu'

import {expect, test} from 'bun:test'

import {AmbientLight, DirectionalLight, HemisphereLight, Material, PointLight} from 'three/webgpu'

import CoffeeTableGeometry from '../../src/lib/gallery/lodgeInterior/CoffeeTableGeometry.ts'
import lodgeInterior, {lodgeFurnitureColliders} from '../../src/lib/gallery/lodgeInterior/layout.ts'
import UpholsteredSeatGeometry from '../../src/lib/gallery/lodgeInterior/UpholsteredSeatGeometry.ts'
import WagonWheelGeometry from '../../src/lib/gallery/lodgeInterior/WagonWheelGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import {IndoorLightsNode, reachesIndoors} from '../../src/lib/materials/lights/index.ts'
import LodgeMaterials from '../../src/lib/materials/LodgeMaterials.ts'
import PlankMaterial from '../../src/lib/materials/PlankMaterial.ts'

test('every Lodge material is lit only by indoor lights and builds its surface nodes', () => {
  const materials = new LodgeMaterials
  try {
    const all = Object.values(materials).flat().filter(value => value instanceof Material)
    expect(all).toHaveLength(11)
    const lightsNodes = new Set(all.map(material => (material as NodeMaterial).lightsNode))
    expect(lightsNodes.size).toBe(1)
    expect([...lightsNodes][0]).toBeInstanceOf(IndoorLightsNode)
    for (const material of [materials.floor, materials.ceiling, materials.logWall, materials.stone, materials.timber, materials.leather, materials.rug, materials.iron]) {
      expect(material.colorNode).not.toBeNull()
      expect(material.normalNode).not.toBeNull()
    }
    expect(materials.floor).toBeInstanceOf(PlankMaterial)
  } finally {
    materials.dispose()
  }
})
test('the gallery’s sun stays outside while lamps, fire and fill lights reach indoors', () => {
  expect(reachesIndoors(new DirectionalLight)).toBe(false)
  for (const light of [new PointLight, new AmbientLight, new HemisphereLight]) {
    expect(reachesIndoors(light)).toBe(true)
  }
})
test('furniture geometry is finite, merged per material and within its triangle budget', () => {
  const sofa = new UpholsteredSeatGeometry(3)
  const chair = new UpholsteredSeatGeometry(1, 0.76)
  const table = new CoffeeTableGeometry(lodgeInterior.coffeeTable.size)
  const wheel = new WagonWheelGeometry(0.85)
  try {
    const parts = [sofa.leather, sofa.timber, chair.leather, chair.timber, table.timber, wheel.iron, wheel.wax, wheel.flames]
    for (const geometry of parts) {
      const position = geometry.getAttribute('position')
      expect(position.count).toBeGreaterThan(0)
      expect([...position.array].every(Number.isFinite)).toBe(true)
      expect(geometry.hasAttribute('normal')).toBe(true)
    }
    const total = parts.reduce((sum, geometry) => sum + triangleCount(geometry), 0)
    expect(total).toBeLessThan(40_000)
    // The sofa’s width follows its seats, and its back stays below the window seat’s.
    expect(sofa.width).toBeCloseTo(3 * 0.68 + UpholsteredSeatGeometry.armWidth * 2)
    sofa.leather.computeBoundingBox()
    expect(sofa.leather.boundingBox!.max.y).toBeLessThanOrEqual(UpholsteredSeatGeometry.backHeight + 0.01)
    expect(sofa.leather.boundingBox!.min.y).toBeGreaterThanOrEqual(0)
    // The table top sits at its nominal height.
    table.timber.computeBoundingBox()
    expect(table.timber.boundingBox!.max.y).toBeCloseTo(lodgeInterior.coffeeTable.size[1], 3)
    // The wheel’s canopy meets the ceiling.
    wheel.iron.computeBoundingBox()
    expect(wheel.iron.boundingBox!.max.y).toBeCloseTo(0.85, 3)
  } finally {
    for (const resource of [sofa, chair, table, wheel]) {
      resource.dispose()
    }
  }
})
test('furniture colliders cover every piece that stands on the floor', () => {
  const names = new Set(lodgeFurnitureColliders().map(collider => collider.name))
  for (const name of ['lodge-sofa', 'lodge-armchair-0', 'lodge-armchair-1', 'lodge-coffee-table']) {
    expect(names.has(name)).toBe(true)
  }
  // The console table, the fire tool stand and the firewood stack were taken out to declutter the room.
  for (const name of ['lodge-console-table', 'lodge-fire-tools', 'lodge-firewood']) {
    expect(names.has(name)).toBe(false)
  }
  // The mantel and the coffee table stay bare.
  for (const key of ['candlesticks', 'books', 'firewood']) {
    expect(key in lodgeInterior).toBe(false)
  }
  for (const {size} of lodgeFurnitureColliders()) {
    expect(size.every(value => Number.isFinite(value) && value > 0)).toBe(true)
  }
})
test('furniture geometry rejects impossible inputs', () => {
  expect(() => new UpholsteredSeatGeometry(0)).toThrow(RangeError)
  expect(() => new UpholsteredSeatGeometry(1.5)).toThrow(RangeError)
  expect(() => new CoffeeTableGeometry([1, Number.NaN, 1])).toThrow(RangeError)
  expect(() => new WagonWheelGeometry(0.2)).toThrow(RangeError)
})
