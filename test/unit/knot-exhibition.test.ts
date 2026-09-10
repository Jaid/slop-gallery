import type {Node} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import {cameraPosition, positionView} from 'three/tsl'
import {EquirectangularReflectionMapping, FloatType} from 'three/webgpu'

import {knots, knotsByNumber} from '../../src/lib/knots/index.ts'
import {knotBays, knotExhibition, knotFloatHeight, knotPreviewX, knotRowHalfWidth, knotSpacing} from '../../src/lib/knots/exhibition.ts'
import {insideKnotGallery, knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'
import {createKnotGeometry, knotGeometryArgs} from '../../src/lib/gallery/sculptures.ts'
import {resolve} from 'node:path'
import {StudioEnvironment} from '../../src/lib/materials/StudioEnvironment.ts'

describe('multi-model Knot challenge', () => {
  test('keeps stable numbers and credits while grouping batches under one candidate', () => {
    expect(knots).toHaveLength(97)
    expect(knotsByNumber.size).toBe(97)
    expect(knotExhibition).toHaveLength(30)
    expect(new Set(knotExhibition.map(item => item.id)).size).toBe(30)
    expect(knotBays).toHaveLength(7)
    expect(knotBays.find(bay => bay.model === 'astra')!.finishes.map(item => item.number)).toEqual([6, 75, 76, 77, 78, 79, 80, 97])
    expect(knotBays.find(bay => bay.model === 'fable')!.finishes.map(item => item.number)).toEqual([89, 90, 91, 92, 93, 94, 95, 96])
    expect(knotBays.find(bay => bay.model === 'deepseek')!.labels).toBe('#17 · #19 · #24')
    expect(knotBays.find(bay => bay.model === 'sol')!.labels).toBe('#72')
    for (const item of knotExhibition) {
      expect(item.archived).not.toBe(true)
      expect(knotsByNumber.get(item.number)!.id).toBe(item.id)
      expect(item.id).toBe(item.model + '/' + item.sourceId)
    }
    expect(knotsByNumber.get(12)!.title).toBe('Stained Requiem')
    expect(knotsByNumber.get(89)!.modelTitle).toBe('Claude Fable 5.1')
  })
  test('keeps every floating Knot inside the expanded lobby with walking clearance', () => {
    for (const [index, exhibit] of knotExhibition.entries()) {
      const [x, , z] = exhibit.position
      expect(insideKnotGallery([x, 0.04, z])).toBe(true)
      expect(x - 0.58).toBeGreaterThan(knotGalleryBounds.minX + 1)
      expect(x + 0.58).toBeLessThan(knotGalleryBounds.maxX - 1)
      expect(z - 0.58).toBeGreaterThan(knotGalleryBounds.northZ + 1)
      expect(z + 0.58).toBeLessThan(knotGalleryBounds.southZ - 1)
      const bay = knotBays.find(candidate => candidate.model === exhibit.model)!
      expect(z).toBe(bay.center[2])
      expect(exhibit.rotation).toBe(0)
      expect(exhibit.label).toBe(`#${String(exhibit.number).padStart(2, '0')}`)
      expect(exhibit.modelTitle).toBe(exhibit.author.model.title)
      for (const other of knotExhibition.slice(index + 1)) {
        expect(Math.hypot(x - other.position[0], z - other.position[2])).toBeGreaterThan(3)
      }
    }
  })
  test('floats at crouching eye height in one row per candidate', () => {
    expect(knotFloatHeight).toBe(1)
    for (const bay of knotBays) {
      const row = knotExhibition.filter(exhibit => exhibit.model === bay.model)
      expect(new Set(row.map(exhibit => exhibit.position[2])).size).toBe(1)
      for (let i = 1; i < row.length; i++) {
        expect(row[i].position[0] - row[i - 1].position[0]).toBe(3.5)
      }
    }
  })
  test('aligns every row to the summary-board side regardless of item count', () => {
    expect(knotBays.some(bay => bay.finishes.length === 1)).toBe(true)
    expect(new Set(knotBays.map(bay => bay.finishes.length)).size).toBeGreaterThan(1)
    for (const bay of knotBays) {
      const row = knotExhibition.filter(exhibit => exhibit.model === bay.model)
      expect(row[0].position[0]).toBe(-knotRowHalfWidth)
      expect(row[0].position[0] - knotPreviewX).toBe(6.25)
      for (const [index, exhibit] of row.entries()) {
        expect(exhibit.position[0]).toBe(-knotRowHalfWidth + index * knotSpacing)
      }
    }
  })
  test('all bay approaches are safe navigation and spawn targets', () => {
    for (const bay of knotBays) {
      const position: [number, number, number] = [-knotRowHalfWidth, 0.04, bay.center[2] + 2.5]
      expect(insideKnotGallery(position)).toBe(true)
      for (const exhibit of knotExhibition) {
        expect(Math.hypot(position[0] - exhibit.position[0], position[2] - exhibit.position[2])).toBeGreaterThan(1.5)
      }
    }
  })
  test('all 97 item modules construct independently while sharing caller-owned lighting', async () => {
    const environment = new StudioEnvironment
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    try {
      for (const exhibit of knots) {
        const {default: Material} = await import(resolve(import.meta.dir, '../../src/lib/knots', exhibit.model, 'items', exhibit.sourceId, 'material.ts'))
        const material = new Material(environment)
        try {
          expect(material.name).toBe(exhibit.sourceId)
          expect(material.envMap).toBe(environment)
          expect(material.isMeshPhysicalNodeMaterial).toBe(true)
          expect(material.map).toBeNull()
          if (exhibit.displacement) {
            expect(material.positionNode).not.toBeNull()
            expect(material.normalNode).not.toBeNull()
          } else {
            expect(material.positionNode).toBeNull()
          }
          const dependencies = new Set<Node>
          for (const value of Object.values(material) as Array<unknown>) {
            if (value && typeof value === 'object' && 'isNode' in value && value.isNode) {
              (value as Node).traverse(node => dependencies.add(node))
            }
          }
          expect(dependencies.has(positionView), exhibit.id).toBe(true)
          // Some submissions express the angular response only through physical Fresnel
          // or view normals, so do not demand object-local cameraPosition from all models.
          if (exhibit.number === 6) {
            expect(dependencies.has(cameraPosition), exhibit.id).toBe(true)
          }
        } finally {
          material.dispose()
        }
      }
      expect(disposed).toBe(false)
    } finally {
      environment.dispose()
    }
    expect(disposed).toBe(true)
  })
  test('provides orthonormal tangents with continuous UV seams for close-up anisotropic shading', () => {
    const geometry = createKnotGeometry()
    try {
      const tangent = geometry.getAttribute('tangent')
      const normal = geometry.getAttribute('normal')
      expect(tangent.count).toBe(normal.count)
      for (let i = 0; i < tangent.count; i++) {
        const x = tangent.getX(i)
        const y = tangent.getY(i)
        const z = tangent.getZ(i)
        if (Math.abs(Math.hypot(x, y, z) - 1) > 1e-6 || Math.abs(x * normal.getX(i) + y * normal.getY(i) + z * normal.getZ(i)) > 1e-6 || Math.abs(tangent.getW(i)) !== 1) {
          throw new Error('Invalid Knot tangent frame.')
        }
      }
      const equal = (a: number, b: number) => {
        expect([tangent.getX(a), tangent.getY(a), tangent.getZ(a), tangent.getW(a)])
          .toEqual([tangent.getX(b), tangent.getY(b), tangent.getZ(b), tangent.getW(b)])
      }
      const [, , tubular, radial] = knotGeometryArgs
      for (let v = 0; v <= radial; v++) {
        equal(v, tubular * (radial + 1) + v)
      }
      for (let u = 0; u <= tubular; u++) {
        equal(u * (radial + 1), u * (radial + 1) + radial)
      }
    } finally {
      geometry.dispose()
    }
  })
  test('generates deterministic, finite high-dynamic-range radiance without files', () => {
    const a = new StudioEnvironment
    const b = new StudioEnvironment
    try {
      expect(a.mapping).toBe(EquirectangularReflectionMapping)
      expect(a.type).toBe(FloatType)
      expect(a.image.data).not.toBe(b.image.data)
      expect(a.image.data).toEqual(b.image.data)
      let maximum = 0
      const pixels = a.image.data!
      for (let i = 0; i < pixels.length; i += 4) {
        for (let channel = 0; channel < 3; channel++) {
          const value = pixels[i + channel]
          if (!Number.isFinite(value) || value < 0) {
            throw new Error('Invalid studio radiance.')
          }
          maximum = Math.max(maximum, value)
        }
        if (pixels[i + 3] !== 1) {
          throw new Error('Invalid studio alpha.')
        }
      }
      expect(maximum).toBeGreaterThan(3)
      expect(maximum).toBeLessThan(5)
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 0.1) {
          throw new Error('Studio fill should not leave metallic surfaces nearly black.')
        }
      }
      // Adjacent texel centers straddle a smooth periodic lighting field at the seam.
      for (let y = 0; y < a.image.height; y++) {
        const first = y * a.image.width * 4
        const last = first + (a.image.width - 1) * 4
        expect(Math.abs(pixels[first] - pixels[last])).toBeLessThan(0.01)
      }
    } finally {
      a.dispose()
      b.dispose()
    }
  })
})
