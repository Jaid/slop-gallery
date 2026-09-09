import {describe, expect, test} from 'bun:test'

import {Box3, BoxGeometry, BufferGeometry, Mesh, MeshBasicNodeMaterial, Raycaster, Vector3} from 'three/webgpu'

import {plantCombinations, plants, pots, showPlantPreview} from '../../src/lib/gallery/plantDecorations/catalog.ts'
import {complexityLabel, decorationComplexity, triangleCount} from '../../src/lib/gallery/plantDecorations/complexity.ts'
import {PlantGeometry} from '../../src/lib/gallery/plantDecorations/PlantGeometry.ts'
import {PotGeometry} from '../../src/lib/gallery/plantDecorations/PotGeometry.ts'

describe('modular botanical catalog', () => {
  test('four vessels × eight botanicals produce every pair exactly once, numbered 01–32', () => {
    expect(pots).toHaveLength(4)
    expect(plants).toHaveLength(8)
    expect(new Set(pots.map(pot => pot.id)).size).toBe(4)
    expect(new Set(plants.map(plant => plant.id)).size).toBe(8)
    expect(plantCombinations.map(combination => combination.number)).toEqual(Array.from({length: 32}, (_, i) => i + 1))
    expect(new Set(plantCombinations.map(combination => `${combination.pot}:${combination.plant}`)).size).toBe(32)
    for (const [row, pot] of pots.entries()) {
      expect(plantCombinations.slice(row * 8, row * 8 + 8).map(combination => combination.plant)).toEqual(plants.map(plant => plant.id))
      expect(plantCombinations.filter(combination => combination.pot === pot.id)).toHaveLength(8)
    }
  })
  test('the installation is temporary and explicitly removable without changing the catalog', () => {
    expect(showPlantPreview('')).toBe(true)
    expect(showPlantPreview('?plantPreview=true')).toBe(true)
    expect(showPlantPreview('?ai=false&plantPreview=false')).toBe(false)
    expect(plantCombinations).toHaveLength(32)
  })
  test('every pot is hollow above its fitted, recessed soil and has a distinct silhouette', () => {
    const material = new MeshBasicNodeMaterial
    const hashes = new Set<bigint | number>
    try {
      for (const pot of pots) {
        const geometry = new PotGeometry(pot.id)
        try {
          hashes.add(Bun.hash(geometry.vertices))
          const shell = new Mesh(geometry.shell, material)
          shell.updateMatrixWorld(true)
          const down = new Raycaster(new Vector3(0.1, 1, 0), new Vector3(0, -1, 0)).intersectObject(shell)
          expect(down[0]!.point.y).toBeLessThan(pot.soilHeight - 0.1)
          for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8
            const inside = new Raycaster(new Vector3(0, pot.soilHeight, 0), new Vector3(Math.cos(angle), 0, Math.sin(angle))).intersectObject(shell)
            expect(inside[0]!.distance).toBeGreaterThanOrEqual(pot.soilRadius)
            expect(inside[0]!.distance - pot.soilRadius).toBeLessThan(0.006)
          }
          geometry.soil.computeBoundingBox()
          expect(geometry.soil.boundingBox!.max.y).toBeCloseTo(pot.soilHeight)
          expect(pot.height - pot.soilHeight).toBeGreaterThanOrEqual(0.07)
          expect(geometry.shell.boundingBox!.max.y).toBeCloseTo(pot.height)
          expect(geometry.vertices).toEqual(Float32Array.from(geometry.shell.getAttribute('position').array))
          expect(Boolean(geometry.trim)).toBe(pot.id === 'noir')
        } finally {
          geometry.dispose()
        }
      }
      expect(hashes.size).toBe(4)
    } finally {
      material.dispose()
    }
  })
  test('all eight plants are deterministic, rooted, finite and individually modeled', () => {
    const hashes = new Set<bigint | number>
    for (const plant of plants) {
      const geometry = new PlantGeometry(plant.id)
      const repeat = new PlantGeometry(plant.id)
      try {
        hashes.add(Bun.hash(geometry.foliage.getAttribute('position').array))
        expect(geometry.foliage.getAttribute('position').array).toEqual(repeat.foliage.getAttribute('position').array)
        expect(geometry.stems.boundingBox!.min.y).toBeLessThan(0)
        expect(geometry.foliage.boundingBox!.max.y).toBeGreaterThan(0.4)
        for (const part of [geometry.foliage, geometry.stems]) {
          for (const name of ['position', 'normal', 'uv']) {
            expect([...part.getAttribute(name).array].every(Number.isFinite)).toBe(true)
          }
          expect(part.getAttribute('position').count % 3).toBe(0)
          expect(part.getAttribute('position').count).toBeGreaterThan(0)
        }
        expect(geometry.foliage.getAttribute('color').count).toBe(geometry.foliage.getAttribute('position').count)
        // Roots stay inside even the narrowest vessel, never floating above its soil.
        const roots = geometry.stems.getAttribute('position')
        for (let i = 0; i < roots.count; i++) {
          if (roots.getY(i) <= 0) {
            expect(Math.hypot(roots.getX(i), roots.getZ(i))).toBeLessThan(0.25)
          }
        }
      } finally {
        geometry.dispose()
        repeat.dispose()
      }
    }
    expect(hashes.size).toBe(8)
  })
  test('all combinations fit inside the room, clear each other and preserve walking lanes', () => {
    const geometries = new Map(plants.map(plant => [plant.id, new PlantGeometry(plant.id)]))
    try {
      const bounds = plantCombinations.map(combination => {
        const plant = geometries.get(combination.plant)!
        const pot = pots.find(candidate => candidate.id === combination.pot)!
        const box = (new Box3).union(plant.foliage.boundingBox!).union(plant.stems.boundingBox!)
        box.translate(new Vector3(0, pot.soilHeight + 0.036, 0))
        box.expandByPoint(new Vector3(-pot.radius, 0, -pot.radius))
        box.expandByPoint(new Vector3(pot.radius, pot.height, pot.radius))
        box.translate(new Vector3(...combination.position))
        expect(box.min.x).toBeGreaterThan(-7)
        expect(box.max.x).toBeLessThan(7)
        expect(box.min.z).toBeGreaterThan(-6.5)
        expect(box.max.z).toBeLessThan(4.1)
        expect(box.max.y).toBeLessThan(2.7)
        return box
      })
      for (let a = 0; a < bounds.length; a++) {
        for (let b = a + 1; b < bounds.length; b++) {
          expect(bounds[a]!.intersectsBox(bounds[b]!)).toBe(false)
        }
      }
      // At least 85 cm between solid pots, before the nonsolid leaf canopies.
      expect(1.65 - Math.max(...pots.map(pot => pot.radius)) * 2).toBeGreaterThanOrEqual(0.84)
    } finally {
      for (const geometry of geometries.values()) {
        geometry.dispose()
      }
    }
  })
})
describe('plant sign complexity', () => {
  test('indexed and merged nonindexed meshes count triangles, not vertices', () => {
    const indexed = new BoxGeometry
    const nonindexed = indexed.toNonIndexed()
    const empty = new BufferGeometry
    try {
      expect(triangleCount(indexed)).toBe(12)
      expect(triangleCount(nonindexed)).toBe(12)
      expect(triangleCount(empty)).toBe(0)
      expect(triangleCount(null)).toBe(0)
    } finally {
      indexed.dispose()
      nonindexed.dispose()
      empty.dispose()
    }
  })
  test('every label includes the plant, vessel, soil and optional brass hardware exactly once', () => {
    const plantGeometry = new Map(plants.map(plant => [plant.id, new PlantGeometry(plant.id)]))
    const potGeometry = new Map(pots.map(pot => [pot.id, new PotGeometry(pot.id)]))
    try {
      for (const combination of plantCombinations) {
        const pot = potGeometry.get(combination.pot)!
        const plant = plantGeometry.get(combination.plant)!
        const counts = decorationComplexity(pot, plant)
        expect(counts.plantTriangles).toBe((plant.foliage.getAttribute('position').count + plant.stems.getAttribute('position').count) / 3)
        expect(counts.potTriangles).toBe((pot.shell.index!.count + pot.soil.index!.count) / 3 + triangleCount(pot.trim))
        expect(counts.triangles).toBe(counts.potTriangles + counts.plantTriangles)
        expect(Number.isSafeInteger(counts.triangles)).toBe(true)
        expect(counts.potTriangles).toBeGreaterThan(triangleCount(pot.shell))
        if (pot.trim) {
          expect(counts.potTriangles).toBeGreaterThan(triangleCount(pot.shell) + triangleCount(pot.soil))
        }
      }
    } finally {
      for (const geometry of [...plantGeometry.values(), ...potGeometry.values()]) {
        geometry.dispose()
      }
    }
  })
  test('sign text names the actual triangle unit and groups large counts with narrow spaces', () => {
    expect(complexityLabel(9999)).toBe('Complexity: 9999 triangles')
    expect(complexityLabel(10_000)).toBe('Complexity: 10 000 triangles')
    expect(complexityLabel(123_456)).toBe('Complexity: 123 456 triangles')
  })
})
