import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {knotLayout} from 'knot-materials/exhibition.ts'

import {insideKnotGallery, knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'
import knottingham from '../../src/worlds/knottingham/index.ts'
import walls from './fixtures/gallery.ts'

describe('Knottingham’s hall', () => {
  test('seals an exhibition hall of its own, sized for the candidate rows', () => {
    expect(knotGalleryBounds.maxX - knotGalleryBounds.minX).toBe(knotLayout.size[0])
    expect(knotGalleryBounds.southZ - knotGalleryBounds.northZ).toBe(knotLayout.size[2])
    expect(knottingham.walls).toHaveLength(4)
    for (const wall of knottingham.walls) {
      expect(wall.holes).toBeUndefined()
      expect(wall.room).toBe('arena')
      expect(wall.sticky).toBeUndefined()
      expect(wall.reservations).toBeUndefined()
      expect(walls.some(galleryWall => galleryWall.id === wall.id)).toBe(false)
    }
  })
  test('holds positions inside its walls on its floor, but not its walls, other heights or non-finite positions', () => {
    expect(insideKnotGallery([knotGalleryBounds.maxX - 1, 0.04, knotLayout.center[2]])).toBe(true)
    for (const position of [[knotGalleryBounds.maxX, 0, -20], [knotGalleryBounds.minX, 0, -20], [0, 0, knotGalleryBounds.northZ], [0, 0, knotGalleryBounds.southZ], [knotGalleryBounds.maxX + 1, 0.04, 0], [0, -6, -20], [0, 6, -20], [Number.NaN, 0, -20], [0, 0, Infinity]] as Array<Vec3>) {
      expect(insideKnotGallery(position)).toBe(false)
    }
  })
})
