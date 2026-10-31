import {beforeEach, describe, expect, test} from 'bun:test'

import {dropPortrait} from '../../src/lib/gallery/actions.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import ImageImporter, {containedRect, imageSize} from '../../src/lib/gallery/ImageImporter.ts'
import portraitLabel, {portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {createDocument, maximumPortraits, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'
import {placementIssue, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import walls, {galleryPlacement, insideGallery, roomAt, rooms, roomVisit} from './fixtures/gallery.ts'
import samplePortraits from './fixtures/portraits.ts'

const original = {
  ...createDocument(),
  portraits: samplePortraits.map(p => ({...p})),
}
beforeEach(() => {
  restoreDocument(original)
  useGallery.setState({sound: false})
})
describe('wall geometry', () => {
  for (const wall of walls) {
    test(`${wall.id}: local coordinates round-trip`, () => {
      // Curved walls wrap; round-trip coordinates within the actual wall span.
      for (const fraction of [-0.45, 0, 0.45]) {
        const u = fraction * wall.width
        expect(wallCoordinates(wall, wallPosition(wall, u, 2.5))).toBeCloseTo(u)
      }
    })
  }
  test('the shipped exhibition leaves space for frames, plates and doors', () => {
    for (const p of samplePortraits) {
      const wall = walls.find(w => w.id === p.wallId)!
      expect(placementIssue(wall, p.position, p.width, p.height, samplePortraits, p.id)).toBe('')
    }
  })
  test('hits the facing wall and preserves the frame offset', () => {
    expect(galleryPlacement.findPlacement([4, 2.5, -24], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'lobby-north',
      position: [4, 2.5, -31.78],
      valid: true,
    })
    expect(galleryPlacement.findPlacement([0, 2.5, 5], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'lobby-north',
      inReach: false,
      valid: false,
    })
  })
  test('doorways are not hanging surfaces', () => {
    expect(galleryPlacement.findPlacement([0, 2, 0], [-1, 0, 0], 2, 2, [])).toMatchObject({
      wallId: 'vesper-west',
      inReach: false,
      valid: false,
    })
    const wall = walls.find(w => w.id === 'lobby-west')!
    expect(placementIssue(wall, wallPosition(wall, 0, 2.5), 2, 2, [])).toContain('doorway')
  })
  test('rejects edges, low labels, ceilings and overlaps', () => {
    const wall = walls[0]
    for (const [u, y] of [[7, 2.5], [0, 1], [0, 5]] as const) {
      expect(placementIssue(wall, wallPosition(wall, u, y), 2, 2, [])).not.toBe('')
    }
    const p = samplePortraits[0]
    expect(placementIssue(wall, p.position, p.width, p.height, samplePortraits)).toContain('close')
    expect(placementIssue(wall, p.position, p.width, p.height, samplePortraits, p.id)).toBe('')
  })
  test('keeps distant wall previews but never accepts them as placements', () => {
    for (const z of [-21.999, 5, 7.5]) {
      expect(galleryPlacement.findPlacement([4, 2.5, z], [0, 0, -1], 2, 2, [])).toMatchObject({
        wallId: 'lobby-north',
        position: [4, 2.5, -31.78],
        inReach: false,
        valid: false,
        reason: 'Move closer to hang this artwork.',
      })
    }
    expect(galleryPlacement.findPlacement([4, 2.5, -22], [0, 0, -1], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
    expect(galleryPlacement.findPlacement([4, 2.5, -22.001], [0, 0, -1], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
  })
  test('reach is measured in world units, not ray parameter units', () => {
    expect(galleryPlacement.findPlacement([0, 2.5, 5], [0, 0, -2], 2, 2, [])).toMatchObject({
      inReach: false,
      valid: false,
    })
    expect(galleryPlacement.findPlacement([4, 2.5, -24], [0, 0, -0.5], 2, 2, [])).toMatchObject({
      inReach: true,
      valid: true,
    })
  })
  test('only wall hits produce previews and closer walls still occlude farther walls', () => {
    expect(galleryPlacement.findPlacement([0, 2.5, 0], [0, 1, 0], 2, 2, [])).toBeNull()
    expect(galleryPlacement.findPlacement([0, 2.5, 0], [0, 0, 0], 2, 2, [])).toBeNull()
    expect(galleryPlacement.findPlacement([0, 2.5, 3], [-1, 0, 0], 2, 2, [])).toMatchObject({
      wallId: 'lobby-west',
      inReach: true,
    })
    expect(galleryPlacement.findPlacement([0, 2.5, 0], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'antechamber-south',
      inReach: false,
    })
  })
  test('the Antechamber is always available for hanging artwork', () => {
    expect(galleryPlacement.findPlacement([0, 2.5, 10], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'antechamber-south',
      inReach: true,
      valid: true,
    })
    expect(galleryPlacement.findPlacement([0, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'lobby-north',
      inReach: false,
    })
  })
  test('the Sienna connects through matching Vesper arches in both directions', () => {
    const vesper = walls.find(wall => wall.id === 'vesper-south')!
    const sienna = walls.find(wall => wall.id === 'sienna-north')!
    const entrance = wallPosition(vesper, vesper.holes![0].u, 2, 0)
    const exit = wallPosition(sienna, sienna.holes![0].u, 2, 0)
    for (const [i, value] of entrance.entries()) {
      expect(value).toBeCloseTo(exit[i])
    }
    expect(galleryPlacement.findPlacement([-10.2, 2.5, 6], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'sienna-south',
      inReach: false,
    })
    expect(galleryPlacement.findPlacement([-10.2, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'vesper-north',
      inReach: false,
    })
    expect(galleryPlacement.findPlacement([-14, 2.5, 6], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'vesper-south',
      inReach: true,
    })
    expect(galleryPlacement.findPlacement([-14, 2.5, 10], [0, 0, -1], 2, 2, [])).toMatchObject({
      wallId: 'sienna-north',
      inReach: true,
    })
  })
  test('the Sienna has usable hanging walls', () => {
    expect(galleryPlacement.findPlacement([-14, 2.5, 14], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: 'sienna-south',
      position: [-14, 2.5, 19.78],
      inReach: true,
      valid: true,
    })
  })
  test('gallery bounds include the new room but not the empty space beside it', () => {
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
    expect(roomAt([-10.2, 2, 7.99])).toBe('vesper')
    expect(roomAt([-10.2, 2, 8.01])).toBe('sienna')
  })
  test('label clearance follows the physical sign footprint', () => {
    const wall = walls[0]
    const layout = portraitLabelLayout(2, 2)
    const lowestCenter = 0.48 - layout.bottom + portraitLabel.clearance
    expect(placementIssue(wall, wallPosition(wall, 4, lowestCenter - 0.001), 2, 2, [])).toContain('label')
    expect(placementIssue(wall, wallPosition(wall, 4, lowestCenter + 0.001), 2, 2, [])).toBe('')
  })
  test('room boundaries are shared by UI and interaction', () => {
    expect(roomAt([-14, 2, 0])).toBe('vesper')
    expect(roomAt([14, 2, 0])).toBe('banquet')
    expect(roomAt([0, 2, 11])).toBe('antechamber')
    expect(roomAt([0, 2, 3])).toBe('lobby')
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
    expect(useGallery.getState().portraits).toHaveLength(samplePortraits.length)
    importer.dispose()
  })
  test('keeps landscape, portrait and square aspect ratios at a frame area of 30 000 cm²', () => {
    for (const [width, height] of [[400, 200], [200, 400], [400, 400]]) {
      const size = imageSize(width, height)
      expect(size.width / size.height).toBeCloseTo(width / height, 9)
      expect(size.width * size.height).toBeCloseTo(3, 9)
    }
  })
  for (const dimensions of [[0, 100], [-1, 100], [Number.NaN, 100], [Infinity, 100], [9000, 9000], [1300, 100], [100, 1300]]) {
    test(`rejects ${dimensions.join('×')}`, () => {
      expect(() => imageSize(dimensions[0], dimensions[1])).toThrow()
    })
  }
})
describe('collection changes', () => {
  test('a dropped work falls off its wall and the held work stays in hand', () => {
    const [dropped, held] = useGallery.getState().portraits
    useGallery.setState({held: held.id})
    expect(dropPortrait(dropped.id)).toBe(true)
    expect(useGallery.getState().held).toBe(held.id)
    const fallen = useGallery.getState().portraits.find(p => p.id === dropped.id)!
    expect(fallen).toMatchObject({
      hung: false,
      wallId: undefined,
      position: dropped.position,
    })
    // It tips forward, away from its wall.
    expect(fallen.velocity![0] * Math.sin(dropped.rotation) + fallen.velocity![2] * Math.cos(dropped.rotation)).toBeGreaterThan(0)
    expect(dropPortrait(dropped.id)).toBe(false)
    expect(dropPortrait(held.id)).toBe(false)
  })
  test('enforces collection capacity', () => {
    const p = samplePortraits[0]
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
    const defaultIds = new Set(samplePortraits.map(p => p.id))
    expect(defaultIds.size).toBe(samplePortraits.length)
    for (const p of samplePortraits) {
      if (typeof p.source !== 'string') {
        throw new TypeError('Default artworks must reference bundled images.')
      }
      expect(p.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
      expect(p.source).toMatch(new RegExp(String.raw`^/art/${p.id}\.jxl$`))
      expect(await Bun.file(new URL(`../../public${p.source}`, import.meta.url)).exists()).toBe(true)
      if (!p.narration) {
        // Recordings are prerendered with an OpenRouter key; only the Salon’s works may still be waiting for theirs.
        expect(p.wallId).toStartWith('salon-')
        continue
      }
      expect(p.narration).toBe(`/audio/${p.id}.opus`)
      expect(await Bun.file(new URL(`../../public${p.narration}`, import.meta.url)).exists()).toBe(true)
    }
  })
  test('does not add recordings omitted from a save', () => {
    const saved = {
      ...samplePortraits[0],
      narration: undefined,
    }
    expect(validateDocument({
      ...original,
      portraits: [saved],
    }).portraits[0].narration).toBeUndefined()
  })
  test('preserves imported image identity', () => {
    const source = new Blob(['pixels'], {type: 'image/webp'})
    const custom = {
      ...samplePortraits[0],
      id: 'my-artwork',
      source,
      imported: true,
    }
    const result = validateDocument({
      ...original,
      portraits: [custom],
    }).portraits[0]
    expect(result.id).toBe(custom.id)
    expect(result.source).toBe(source)
  })
  test('round-trips artwork hung in the Sienna', () => {
    const wall = walls.find(candidate => candidate.id === 'sienna-south')!
    const portrait = {
      ...samplePortraits[0],
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
          ...samplePortraits[0],
          hung: false,
          position: [-6, 2, 18],
        },
      ],
    })).toThrow('outside the gallery')
  })
  test('accepts the shipped collection', () => {
    expect(validateDocument(original).portraits.map(p => p.id)).toEqual(original.portraits.map(p => p.id))
  })
  test('rejects unknown top-level state instead of silently stripping it', () => {
    expect(() => validateDocument({
      ...original,
      exhibition: 2,
    })).toThrow('supported')
  })
  test('rejects unknown settings instead of silently stripping them', () => {
    expect(() => validateDocument({
      ...original,
      settings: {
        ...original.settings,
        apiKey: 'injected',
        ready: true,
      },
    })).toThrow('invalid settings')
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
