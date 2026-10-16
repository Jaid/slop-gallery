import {describe, expect, test} from 'bun:test'

import {mulberry32} from 'math/random'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import walls, {rooms} from '../../src/lib/gallery/walls.ts'
import VesperWallMaterial, {fanAt, vesperFans} from '../../src/lib/materials/VesperWallMaterial.ts'

const vesper = rooms.find(room => room.id === 'vesper')!
const vesperWalls = walls.filter(wall => wall.room === 'vesper')
const randomState = mulberry32.create(51)
/** Seeded, so failures reproduce. */
const random = () => mulberry32.sample(randomState)
/** Every fan containing the point, searched over far more rows than the shader looks at. */
const bruteForceFan = (x: number, y: number) => {
  const {radius, rowStep} = vesperFans
  const step = radius * rowStep
  for (let row = Math.floor(y / step) - 10; row <= Math.floor(y / step) + 10; row++) {
    const offset = (row % 2 + 2) % 2 * radius
    for (let column = Math.floor((x - offset) / (2 * radius)) - 2; column <= Math.floor((x - offset) / (2 * radius)) + 2; column++) {
      const center: [number, number] = [column * 2 * radius + offset, row * step]
      if (Math.hypot(x - center[0], y - center[1]) < radius) {
        return {
          center,
          row,
        }
      }
    }
  }
}
const localPoint = (x: number, y: number) => {
  const fan = fanAt(x, y)!
  return [x - fan.center[0], y - fan.center[1]]
}
describe('the Vesper’s fan stencil', () => {
  test('the shader’s four-row search finds the frontmost fan everywhere', () => {
    for (let i = 0; i < 40_000; i++) {
      const x = (random() - 0.5) * 16
      const y = random() * 4
      const fan = fanAt(x, y)
      expect(fan).toBeDefined()
      // Rows are searched bottom-up, so the first hit of the brute force is the frontmost fan.
      expect(fan).toEqual(bruteForceFan(x, y))
    }
  })
  test('fans overlap like shingles: every fan hides behind the row in front of it', () => {
    const {radius, rowStep} = vesperFans
    // The top of a fan is never covered, the point right below its center always is.
    expect(fanAt(0, radius * 0.99)!.center).toEqual([0, 0])
    const covered = fanAt(0, radius * rowStep * 2 - 0.01)!
    expect(covered.row).toBeLessThan(2)
  })
  test('every corner folds the pattern like a mirror', () => {
    const {radius, wavelength} = vesperFans
    const widths = new Set(vesperWalls.map(wall => wall.width))
    expect([...widths].toSorted((a, b) => a - b)).toEqual(vesper.size.toSorted((a, b) => a - b))
    // Both the fans and the guilloche repeat a whole number of times in the difference between the wall lengths.
    const difference = Math.abs(vesper.size[0] - vesper.size[1])
    for (const period of [2 * radius, wavelength]) {
      expect(Math.abs(difference / period - Math.round(difference / period))).toBeLessThan(1e-9)
    }
    const corners = vesper.size.map(size => size / 2 - wallFace)
    for (let i = 0; i < 500; i++) {
      const distance = random() * 3
      const y = random() * 4
      const [a, b] = corners.map(corner => localPoint(corner - distance, y))
      expect(a[0]).toBeCloseTo(b[0], 9)
      expect(a[1]).toBeCloseTo(b[1], 9)
      // The pattern is symmetric about each wall’s middle, so the opposite corner matches as well.
      const [mirroredX, mirroredY] = localPoint(-(corners[0] - distance), y)
      expect(mirroredX).toBeCloseTo(-a[0], 9)
      expect(mirroredY).toBeCloseTo(a[1], 9)
    }
  })
  test('the fan field sits between the border bands, below the cornice', () => {
    const {border, frieze} = vesperFans
    expect(border[0]).toBeGreaterThan(0.44)
    expect(border[1]).toBeGreaterThan(border[0])
    expect(frieze[0]).toBeGreaterThan(border[1])
    // The cornice starts 0.47 m below the wall top and stands 0.27 m proud, so anything above it is hidden.
    for (const wall of vesperWalls) {
      expect(frieze[1]).toBeLessThan(wall.height - 0.47)
    }
  })
  test('the material builds every surface node and disposes its studio', () => {
    const material = new VesperWallMaterial({
      center: vesper.center,
      size: vesper.size,
    })
    for (const node of [material.colorNode, material.normalNode, material.roughnessNode, material.metalnessNode, material.clearcoatNode, material.iridescenceNode, material.iridescenceThicknessNode, material.specularIntensityNode]) {
      expect(node).not.toBeNull()
    }
    const studio = material.envMap!
    expect(studio).not.toBeNull()
    let disposed = false
    studio.addEventListener('dispose', () => {
      disposed = true
    })
    material.dispose()
    expect(disposed).toBe(true)
  })
})
