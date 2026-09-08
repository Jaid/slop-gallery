import {beforeEach, describe, expect, test} from 'bun:test'

import {portraitLabel, portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {containedRect, ImageImporter, imageSize} from '../../src/lib/gallery/ImageImporter.ts'
import {createDocument, maximumPortraits, redo, restoreDocument, undo, useGallery} from '../../src/lib/gallery/store.ts'
import {findPlacement, placementIssue, roomAt, wallCoordinates, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

const original = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
  secretOpen: false,
}
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({sound: false})
})
describe('wall geometry', () => {
  for (const wall of walls) {
    test(`${wall.id}: local coordinates round-trip`, () => {
      expect(wallCoordinates(wall, wallPosition(wall, 1.7, 2.5))).toBeCloseTo(1.7)
    })
  }
  test('the shipped exhibition leaves space for frames, plates and doors', () => {
    for (const p of initialPortraits) {
      const wall = walls.find(w => w.id === p.wallId)!
      expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits, p.id)).toBe('')
    }
  })
  test('hits the facing wall and preserves the frame offset', () => {
    expect(findPlacement([0, 2.5, 0], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'daydream-north',
      position: [0, 2.5, -7.78],
      valid: true,
    })
    expect(findPlacement([0, 2.5, 5], [0, 0, -1], 2, 2, [])).toMatchObject({wallId: 'daydream-north', inReach: false, valid: false})
  })
  test('doorways are not hanging surfaces', () => {
    expect(findPlacement([0, 2, 3], [-1, 0, 0], 2, 2, [])).toMatchObject({wallId: 'cabinet-west', inReach: false, valid: false})
    const wall = walls.find(w => w.id === 'daydream-west')!
    expect(placementIssue(wall, wallPosition(wall, -4.6, 2.5), 2, 2, [])).toContain('doorway')
  })
  test('rejects edges, low labels, ceilings and overlaps', () => {
    const wall = walls[0]!
    for (const [u, y] of [[7, 2.5], [0, 1], [0, 5]] as const) {
      expect(placementIssue(wall, wallPosition(wall, u, y), 2, 2, [])).not.toBe('')
    }
    const p = initialPortraits[0]!
    expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits)).toContain('close')
    expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits, p.id)).toBe('')
  })

  test('keeps distant wall previews but never accepts them as placements', () => {
    for (const z of [2.001, 5, 7.5]) {
      expect(findPlacement([0, 2.5, z], [0, 0, -1], 2, 2, [])).toMatchObject({
        wallId: 'daydream-north',
        position: [0, 2.5, -7.78],
        inReach: false,
        valid: false,
        reason: 'Move closer to hang this artwork.',
      })
    }
    expect(findPlacement([0, 2.5, 2], [0, 0, -1], 2, 2, [])).toMatchObject({inReach: true, valid: true})
    expect(findPlacement([0, 2.5, 1.999], [0, 0, -1], 2, 2, [])).toMatchObject({inReach: true, valid: true})
  })
  test('reach is measured in world units, not ray parameter units', () => {
    expect(findPlacement([0, 2.5, 5], [0, 0, -2], 2, 2, [])).toMatchObject({inReach: false, valid: false})
    expect(findPlacement([0, 2.5, 0], [0, 0, -0.5], 2, 2, [])).toMatchObject({inReach: true, valid: true})
  })
  test('only wall hits produce previews and closer walls still occlude farther walls', () => {
    expect(findPlacement([0, 2.5, 0], [0, 1, 0], 2, 2, [])).toBeNull()
    expect(findPlacement([0, 2.5, 0], [0, 0, 0], 2, 2, [])).toBeNull()
    expect(findPlacement([0, 2.5, 0], [-1, 0, 0], 2, 2, [])).toMatchObject({wallId: 'daydream-west', inReach: true})
    expect(findPlacement([0, 2.5, 0], [0, 0, 1], 2, 2, [])).toBeNull()
    expect(findPlacement([0, 2.5, 0], [0, 0, 1], 2, 2, [], '', true)).toMatchObject({wallId: 'secret-south', inReach: false})
  })
  test('label clearance follows the physical sign footprint', () => {
    const wall = walls[0]!
    const layout = portraitLabelLayout(2, 2)
    const lowestCenter = 0.48 - layout.bottom + portraitLabel.clearance
    expect(placementIssue(wall, wallPosition(wall, 0, lowestCenter - 0.001), 2, 2, [])).toContain('label')
    expect(placementIssue(wall, wallPosition(wall, 0, lowestCenter + 0.001), 2, 2, [])).toBe('')
  })

  test('room boundaries are shared by UI and interaction', () => {
    expect(roomAt([-14, 2, 0])).toBe('cabinet')
    expect(roomAt([14, 2, 0])).toBe('afterhours')
    expect(roomAt([0, 2, 11])).toBe('secret')
    expect(roomAt([0, 2, 3])).toBe('daydream')
  })
})
describe('image dimensions', () => {
  test('fits generated images without distortion or cropping', () => {
    expect(containedRect(400, 100, 600, 300)).toEqual([0, 75, 600, 150])
    expect(containedRect(100, 400, 600, 300)).toEqual([262.5, 0, 75, 300])
  })
  test('a queued import cannot survive a collection replacement', async () => {
    const importer = new ImageImporter(() => { throw new Error('An abandoned import was committed.') })
    const job = importer.import([new File(['image'], 'pending.png', {type: 'image/png'})])
    restoreDocument(original)
    await job
    expect(useGallery.getState().portraits).toHaveLength(12)
    importer.dispose()
  })
  test('preserves landscape, portrait and square aspect ratios', () => {
    expect(imageSize(400, 200)).toEqual({
      width: 2.4,
      height: 1.2,
    })
    expect(imageSize(200, 400)).toEqual({
      width: 1.2,
      height: 2.4,
    })
    expect(imageSize(400, 400)).toEqual({
      width: 2.4,
      height: 2.4,
    })
  })
  for (const dimensions of [[0, 100], [-1, 100], [Number.NaN, 100], [Infinity, 100], [9000, 9000], [1300, 100], [100, 1300]]) {
    test(`rejects ${dimensions}`, () => {
      expect(() => imageSize(dimensions[0]!, dimensions[1]!)).toThrow()
    })
  }
})
describe('transactional history', () => {
  test('undo/redo preserves Blob identity without restoring active jobs', () => {
    const source = new Blob(['pixels'], {type: 'image/webp'})
    const state = useGallery.getState()
    const first = state.portraits[0]!
    state.update(first.id, {
      source,
      pending: true,
      merging: true,
    })
    state.remove(first.id)
    expect(undo()).toBe(true)
    expect(useGallery.getState().portraits[0]).toMatchObject({
      source,
      pending: false,
      merging: false,
      reserved: false,
    })
    expect(useGallery.getState().portraits[0]!.source).toBe(source)
    expect(redo()).toBe(true)
    expect(useGallery.getState().portraits.some(p => p.id === first.id)).toBe(false)
  })
  test('caps history and clears the redo branch after a new edit', () => {
    for (let i = 0; i < 30; i++) {
      useGallery.getState().commit(useGallery.getState().portraits)
    }
    expect(useGallery.getState().past).toHaveLength(20)
    undo()
    useGallery.getState().commit(useGallery.getState().portraits)
    expect(redo()).toBe(false)
  })
  test('enforces collection capacity', () => {
    const p = initialPortraits[0]!
    useGallery.setState({
      portraits: Array.from({length: maximumPortraits}, (_, i) => ({
        ...p,
        id: String(i),
      })),
    })
    expect(() => useGallery.getState().add({
      ...p,
      id: 'overflow',
    })).toThrow()
  })
  test('documents never contain runtime state or keys', () => {
    useGallery.setState({
      apiKey: 'not-for-export',
      held: 'goose',
      notice: 'runtime',
    })
    expect(JSON.stringify(createDocument())).not.toContain('not-for-export')
    expect(createDocument()).not.toHaveProperty('held')
  })
})
describe('backup validation', () => {
  test('accepts the shipped collection', () => {
    expect(validateDocument(original).portraits).toHaveLength(12)
  })
  test('strips unknown settings instead of spreading them into the store', () => {
    expect(validateDocument({
      ...original,
      settings: {
        ...original.settings,
        apiKey: 'injected',
        ready: true,
      },
    }).settings).toEqual(original.settings)
  })
  for (const patch of [{source: 'https://example.com/tracker'}, {source: '/audio/beige.opus'}, {position: [Number.NaN, 2, 0]}, {width: 0}, {wallId: 'missing'}, {rotation: Math.PI}, {position: [0, 2, 0]}, {orientation: [0, 0, 0, 0]}]) {
    test(`rejects malformed artwork ${JSON.stringify(patch)}`, () => {
      expect(() => validateDocument({
        ...original,
        portraits: [
          {
            ...original.portraits[0],
            ...patch,
          },
        ],
      })).toThrow()
    })
  }
  test('rejects duplicate identities and future versions', () => {
    expect(() => validateDocument({
      ...original,
      portraits: [original.portraits[0], original.portraits[0]],
    })).toThrow()
    expect(() => validateDocument({
      ...original,
      version: 2,
    })).toThrow()
  })
})
