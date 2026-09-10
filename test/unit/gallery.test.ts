import {beforeEach, describe, expect, test} from 'bun:test'

import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {containedRect, ImageImporter, imageSize} from '../../src/lib/gallery/ImageImporter.ts'
import {portraitLabel, portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {createDocument, maximumPortraits, redo, restoreDocument, undo, useGallery} from '../../src/lib/gallery/store.ts'
import {findPlacement, galleryBounds, insideGallery, placementIssue, roomAt, rooms, roomVisit, wallCoordinates, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

const original = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
}
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({sound: false})
})
describe('wall geometry', () => {
  for (const wall of walls) {
    test(`${wall.id}: local coordinates round-trip`, () => {
      // Curved walls wrap; round-trip coordinates within the actual wall span.
      for (const u of [-0.45, 0, 0.45].map(fraction => fraction * wall.width)) {
        expect(wallCoordinates(wall, wallPosition(wall, u, 2.5))).toBeCloseTo(u)
      }
    })
  }
  test('the two Doge images are independent, normally hung portraits', () => {
    const velvet = initialPortraits.find(p => p.id === 'dog')!
    const neon = initialPortraits.find(p => p.id === 'wolf')!
    expect(velvet.source).toBe('/art/dog.webp')
    expect(neon.source).toBe('/art/wolf.webp')
    expect(velvet.hung).toBe(true)
    expect(neon.hung).toBe(true)
    expect(velvet.position).not.toEqual(neon.position)
    expect(velvet.narration).toBe('/audio/dog.opus')
    expect(neon.narration).toBe('/audio/wolf.opus')
    useGallery.getState().remove(velvet.id)
    expect(useGallery.getState().portraits.some(p => p.id === neon.id)).toBe(true)
  })
  test('the shipped exhibition leaves space for frames, plates and doors', () => {
    for (const p of initialPortraits) {
      const wall = walls.find(w => w.id === p.wallId)!
      expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits, p.id)).toBe('')
    }
  })
  test('hits the facing wall and preserves the frame offset', () => {
    expect(findPlacement([4, 2.5, -24], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'daydream-north',
      position: [4, 2.5, -31.78],
      valid: true,
    })
    expect(findPlacement([0, 2.5, 5], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'daydream-north',
      inReach: false,
      valid: false,
    })
  })
  test('doorways are not hanging surfaces', () => {
    expect(findPlacement([0, 2, 3], [-1, 0, 0], 2, 2, [])).toMatchObject({
      wallId: 'cabinet-west',
      inReach: false,
      valid: false,
    })
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
    for (const z of [-21.999, 5, 7.5]) {
      expect(findPlacement([4, 2.5, z], [0, 0, -1], 2, 2, [])).toMatchObject({
        wallId: 'daydream-north',
        position: [4, 2.5, -31.78],
        inReach: false,
        valid: false,
        reason: 'Move closer to hang this artwork.',
      })
    }
    expect(findPlacement([4, 2.5, -22], [0, 0, -1], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
    expect(findPlacement([4, 2.5, -22.001], [0, 0, -1], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
  })
  test('reach is measured in world units, not ray parameter units', () => {
    expect(findPlacement([0, 2.5, 5], [0, 0, -2], 2, 2, [])).toMatchObject({
      inReach: false,
      valid: false,
    })
    expect(findPlacement([4, 2.5, -24], [0, 0, -0.5], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
  })
  test('only wall hits produce previews and closer walls still occlude farther walls', () => {
    expect(findPlacement([0, 2.5, 0], [0, 1, 0], 2, 2, [])).toBeNull()
    expect(findPlacement([0, 2.5, 0], [0, 0, 0], 2, 2, [])).toBeNull()
    expect(findPlacement([0, 2.5, 0], [-1, 0, 0], 2, 2, [])).toMatchObject({
      wallId: 'daydream-west',
      inReach: true,
    })
    expect(findPlacement([0, 2.5, 0], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'antechamber-south',
      inReach: false,
    })
  })
  test('the Antechamber is always available for hanging artwork', () => {
    expect(findPlacement([0, 2.5, 10], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'antechamber-south',
      inReach: true,
      valid: true,
    })
    expect(findPlacement([0, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'daydream-north',
      inReach: false,
    })
  })
  test('the Amber Room connects through matching Cabinet arches in both directions', () => {
    const cabinet = walls.find(wall => wall.id === 'cabinet-south')!
    const amber = walls.find(wall => wall.id === 'amber-north')!
    const entrance = wallPosition(cabinet, cabinet.holes![0]!.u, 2, 0)
    const exit = wallPosition(amber, amber.holes![0]!.u, 2, 0)
    for (const [i, value] of entrance.entries()) {
      expect(value).toBeCloseTo(exit[i]!)
    }
    expect(findPlacement([-10.2, 2.5, 6], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'amber-south',
      inReach: false,
    })
    expect(findPlacement([-10.2, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'cabinet-north',
      inReach: false,
    })
    expect(findPlacement([-14, 2.5, 6], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'cabinet-south',
      inReach: true,
    })
    expect(findPlacement([-14, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'amber-north',
      inReach: true,
    })
  })
  test('the Amber Room has usable hanging walls', () => {
    expect(findPlacement([-14, 2.5, 14], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'amber-south',
      position: [-14, 2.5, 19.78],
      inReach: true,
      valid: true,
    })
  })
  test('gallery bounds include the new room but not the empty space beside it', () => {
    expect(galleryBounds).toEqual({
      minX: -35.7,
      maxX: 20,
      minZ: -36,
      maxZ: 32.5,
    })
    for (const position of [[-14, 2, 14], [-14, 2, 19.8], [0, 2, 14], [-20, 0, 20]] as const) {
      expect(insideGallery([...position])).toBe(true)
    }
    for (const position of [[-6, 2, 18], [14, 3, 14], [-14, 2, 20.01], [-20.01, 2, 14], [-14, -1.01, 14], [-14, 6.01, 14], [Number.NaN, 2, 14]] as const) {
      expect(insideGallery([...position])).toBe(false)
    }
  })
  test('every floor-plan destination lands inside its own room', () => {
    for (const room of rooms) {
      const visit = roomVisit(room)
      expect(insideGallery(visit.position)).toBe(true)
      expect(roomAt(visit.position)).toBe(room.id)
      expect(Math.hypot(...visit.rotation)).toBeCloseTo(1)
    }
    expect(roomAt([-10.2, 2, 7.99])).toBe('cabinet')
    expect(roomAt([-10.2, 2, 8.01])).toBe('amber')
  })
  test('label clearance follows the physical sign footprint', () => {
    const wall = walls[0]!
    const layout = portraitLabelLayout(2, 2)
    const lowestCenter = 0.48 - layout.bottom + portraitLabel.clearance
    expect(placementIssue(wall, wallPosition(wall, 4, lowestCenter - 0.001), 2, 2, [])).toContain('label')
    expect(placementIssue(wall, wallPosition(wall, 4, lowestCenter + 0.001), 2, 2, [])).toBe('')
  })
  test('room boundaries are shared by UI and interaction', () => {
    expect(roomAt([-14, 2, 0])).toBe('cabinet')
    expect(roomAt([14, 2, 0])).toBe('afterhours')
    expect(roomAt([0, 2, 11])).toBe('antechamber')
    expect(roomAt([0, 2, 3])).toBe('daydream')
  })
})
describe('image dimensions', () => {
  test('fits generated images without distortion or cropping', () => {
    expect(containedRect(400, 100, 600, 300)).toEqual([0, 75, 600, 150])
    expect(containedRect(100, 400, 600, 300)).toEqual([262.5, 0, 75, 300])
  })
  test('a queued import cannot survive a collection replacement', async () => {
    const importer = new ImageImporter(() => {
      throw new Error('An abandoned import was committed.')
    })
    const job = importer.import([new File(['image'], 'pending.png', {type: 'image/png'})])
    restoreDocument(original)
    await job
    expect(useGallery.getState().portraits).toHaveLength(16)
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
    test(`rejects ${dimensions.join('×')}`, () => {
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
  test('default IDs match unique, existing artwork and narration filenames', async () => {
    expect(new Set(initialPortraits.map(p => p.id)).size).toBe(initialPortraits.length)
    for (const p of initialPortraits) {
      if (typeof p.source !== 'string') {
        throw new TypeError('Default artworks must reference bundled images.')
      }
      expect(p.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
      expect(p.source).toMatch(new RegExp(String.raw`^/art/${p.id}\.(webp|png|avif)$`))
      expect(await Bun.file(new URL(`../../public${p.source}`, import.meta.url)).exists()).toBe(true)
      expect(p.narration).toBe(`/audio/${p.id}.opus`)
      if (p.narration) {
        expect(p.narration).toBe(`/audio/${p.id}.opus`)
        expect(await Bun.file(new URL(`../../public${p.narration}`, import.meta.url)).exists()).toBe(true)
      }
    }
  })
  test('renamed defaults in saved collections preserve edits and migrate asset paths', () => {
    const shrimp = initialPortraits.find(p => p.id === 'shrimp')!
    const old = {
      ...shrimp,
      id: 'shrimpman',
      source: '/art/shrimpman.webp',
      narration: '/audio/shrimpman.opus',
      title: 'My custom title',
      description: 'My custom story.',
    }
    const result = validateDocument({
      ...original,
      portraits: [old],
    }).portraits[0]!
    expect(result).toMatchObject({
      ...shrimp,
      title: old.title,
      description: old.description,
    })
    expect(old.id).toBe('shrimpman')
    expect(validateDocument({
      ...original,
      portraits: [result],
    }).portraits[0]).toEqual(result)
    expect(() => validateDocument({
      ...original,
      portraits: [old, shrimp],
    })).toThrow()
  })
  for (const id of ['doge-neon', 'dog-neon']) {
    test(`migrates ${id} to wolf`, () => {
      const wolf = initialPortraits.find(p => p.id === 'wolf')!
      const result = validateDocument({
        ...original,
        portraits: [
          {
            ...wolf,
            id,
            source: `/art/${id}.webp`,
          },
        ],
      }).portraits[0]!
      expect(result).toMatchObject(wolf)
    })
  }
  test('existing unedited defaults gain recordings without replacing edited stories', () => {
    const goose = initialPortraits.find(p => p.id === 'goose')!
    const saved = {
      ...goose,
      narration: undefined,
    }
    const load = (patch = {}) => validateDocument({
      ...original,
      portraits: [
        {
          ...saved,
          ...patch,
        },
      ],
    }).portraits[0]!
    expect(load().narration).toBe('/audio/goose.opus')
    expect(load({title: 'My title'}).narration).toBeUndefined()
    expect(load({description: 'My story.'}).narration).toBeUndefined()
    expect(load({source: new Blob(['pixels'], {type: 'image/webp'})}).narration).toBeUndefined()
    expect(saved.narration).toBeUndefined()
  })
  test('renaming defaults does not replace imported images', () => {
    const source = new Blob(['pixels'], {type: 'image/webp'})
    const custom = {
      ...initialPortraits[0]!,
      id: 'my-artwork',
      source,
      imported: true,
    }
    const result = validateDocument({
      ...original,
      portraits: [custom],
    }).portraits[0]!
    expect(result.id).toBe(custom.id)
    expect(result.source).toBe(source)
  })
  test('round-trips artwork hung in the Amber Room', () => {
    const wall = walls.find(wall => wall.id === 'amber-south')!
    const portrait = {
      ...initialPortraits[0]!,
      wallId: wall.id,
      rotation: wall.rotation,
      position: wallPosition(wall, 0, 2.5),
    }
    const saved = validateDocument({
      ...original,
      portraits: [portrait],
    })
    expect(saved.portraits[0]).toMatchObject(portrait)
    expect(validateDocument(saved)).toEqual(saved)
  })
  test('rejects loose artwork outside the actual room footprint', () => {
    expect(() => validateDocument({
      ...original,
      portraits: [
        {
          ...initialPortraits[0]!,
          hung: false,
          position: [-6, 2, 18],
        },
      ],
    })).toThrow('outside the gallery')
  })
  test('accepts the shipped collection', () => {
    expect(validateDocument(original).portraits).toHaveLength(16)
  })
  for (const secretOpen of [false, true]) {
    test(`ignores the retired puzzle state in existing collections (${secretOpen})`, () => {
      const document = validateDocument({
        ...original,
        secretOpen,
      })
      expect(document).toEqual(validateDocument(original))
      expect(document).not.toHaveProperty('secretOpen')
      restoreDocument(document)
      useGallery.getState().remove(original.portraits[0]!.id)
      expect(undo()).toBe(true)
      expect(createDocument()).not.toHaveProperty('secretOpen')
      expect(useGallery.getState().portraits).toHaveLength(16)
    })
  }
  test('loads an existing Doge without retaining its retired recording or alternate image', () => {
    const doge = initialPortraits.find(p => p.id === 'dog')!
    const document = validateDocument({
      ...original,
      portraits: [
        {
          ...doge,
          alternateSource: '/art/wolf.webp',
          narration: '/audio/doge.opus',
        },
      ],
    })
    expect(document.portraits).toHaveLength(1)
    expect(document.portraits[0]!.source).toBe(doge.source)
    expect(document.portraits[0]!.narration).toBeUndefined()
    expect(document.portraits[0]).not.toHaveProperty('alternateSource')
    expect(() => validateDocument({
      ...original,
      portraits: [
        {
          ...doge,
          narration: '/audio/unknown.opus',
        },
      ],
    })).toThrow()
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
  for (const patch of [{source: 'https://example.com/tracker'}, {source: '/audio/doge.opus'}, {position: [Number.NaN, 2, 0]}, {width: 0}, {wallId: 'missing'}, {rotation: Math.PI}, {position: [0, 2, 0]}, {orientation: [0, 0, 0, 0]}]) {
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
