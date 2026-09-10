import type {PlayerPose, Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {insideKnotGallery, knotGalleryBounds, knotGalleryWalls} from '../../src/lib/gallery/knotGallery.ts'
import {rooms, walls} from '../../src/lib/gallery/walls.ts'

describe('permanent Knot Gallery', () => {
  test('independently seals a 56 × 74 m exhibition hall', () => {
    expect(knotGalleryBounds.maxX - knotGalleryBounds.minX).toBe(56)
    expect(knotGalleryBounds.southZ - knotGalleryBounds.northZ).toBe(74)
    expect(knotGalleryWalls).toHaveLength(4)
    for (const wall of knotGalleryWalls) {
      expect(wall.holes).toBeUndefined()
      expect(wall.room).toBe('lobby')
      expect(wall.hangable).toBe(false)
      expect(walls.some(original => original.id === wall.id)).toBe(false)
    }
    expect(rooms.find(room => room.id === 'lobby')!.size).toEqual([16, 40])
    expect(walls.find(wall => wall.id === 'lobby-east')!.holes!.length).toBeGreaterThan(0)
  })
  test('preserves saves in the enlarged areas, but rejects walls and disabled elevations', () => {
    const pose: PlayerPose = {
      position: [23, 0.04, -35],
      yaw: 0.8,
      pitch: -0.1,
    }
    expect(insideKnotGallery(pose.position)).toBe(true)
    for (const position of [[28, 0, -20], [-28, 0, -20], [0, 0, -64], [0, 0, 10], [0, -6, -20], [0, 6, -20], [Number.NaN, 0, -20], [0, 0, Infinity]] as Array<Vec3>) {
      expect(insideKnotGallery(position)).toBe(false)
    }
    const outside: PlayerPose = {
      position: [40, 0.04, 0],
      yaw: 1,
      pitch: 0.2,
    }
    expect(insideKnotGallery(outside.position)).toBe(false)
  })
})
