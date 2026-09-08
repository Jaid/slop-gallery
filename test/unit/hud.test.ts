import {afterAll, describe, expect, test} from 'bun:test'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3} from 'three/webgpu'

import ArtworkOverlay from '../../src/components/App/ArtworkOverlay.tsx'
import NarrationIndicator from '../../src/components/App/NarrationIndicator.tsx'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {GalleryRepository, validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {isPortraitLabelHit, portraitLabel, portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'

describe('title plate targeting', () => {
  const layout = portraitLabelLayout(2, 2)
  const portrait = new Group
  const label = new Group
  label.userData.portraitLabel = true
  label.position.y = layout.y
  const material = new MeshBasicMaterial
  const frame = new Mesh(new BoxGeometry(2.18, 2.18, 0.16), material)
  const backing = new Mesh(new BoxGeometry(layout.width, portraitLabel.height, portraitLabel.depth), material)
  const text = new Mesh(new PlaneGeometry(layout.titleWidth, 0.135), material)
  text.position.set(0, 0.047, 0.026)
  label.add(backing, text)
  portrait.add(frame, label)
  portrait.updateMatrixWorld(true)
  afterAll(() => {
    for (const mesh of [frame, backing, text]) mesh.geometry.dispose()
    material.dispose()
  })
  const target = (x: number, y: number) => {
    const ray = new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1), 0, 9)
    return ray.intersectObject(portrait, true)[0]
  }
  test('aiming at either lettering or the plate backing identifies the plate', () => {
    const lettering = target(0, layout.y + 0.047)!
    expect(lettering.object).toBe(text)
    expect(isPortraitLabelHit(lettering.object, portrait)).toBe(true)
    const plate = target(layout.width / 2 - 0.01, layout.y - 0.12)!
    expect(plate.object).toBe(backing)
    expect(isPortraitLabelHit(plate.object, portrait)).toBe(true)
  })
  test('the image, frame and empty space do not identify a title plate', () => {
    expect(isPortraitLabelHit(target(0, 0)!.object, portrait)).toBe(false)
    expect(isPortraitLabelHit(target(1.07, 0)!.object, portrait)).toBe(false)
    expect(target(0, layout.y - 0.4)).toBeUndefined()
  })
  test('preview labels are not readable artwork targets', () => {
    const preview = new Group
    preview.userData.portraitLabel = false
    const previewText = new Group
    preview.add(previewText)
    expect(isPortraitLabelHit(previewText, portrait)).toBe(false)
  })
})

describe('contextual HUD', () => {
  test('the artwork overlay includes title, description, creator and year', () => {
    const p = {...initialPortraits[0]!, year: 1924}
    const html = renderToStaticMarkup(createElement(ArtworkOverlay, {portrait: p}))
    for (const value of [p.title, p.description, p.creator, p.year]) expect(html).toContain(String(value))
    expect(html).not.toContain('Undated')
  })
  test('year zero is not mistaken for a missing year', () => {
    const html = renderToStaticMarkup(createElement(ArtworkOverlay, {portrait: {...initialPortraits[0]!, year: 0}}))
    expect(html).toContain('<span>0</span>')
    expect(html).not.toContain('Undated')
  })
  test('missing years are explicitly undated', () => {
    expect(renderToStaticMarkup(createElement(ArtworkOverlay, {portrait: initialPortraits[0]!}))).toContain('Undated')
  })
  test('recorded and provider audio show the real five-band visualization', () => {
    const html = renderToStaticMarkup(createElement(NarrationIndicator, {title: 'A story', status: 'playing', source: 'audio'}))
    expect(html).toContain('A story')
    expect(html).toContain('Narrator playing')
    expect(html).toContain('audio-bars playing')
    expect(html.match(/<i>/g)).toHaveLength(5)
  })
  test('browser speech shows a static speaking icon, not a spectrum', () => {
    const html = renderToStaticMarkup(createElement(NarrationIndicator, {title: 'A browser story', status: 'playing', source: 'browser'}))
    expect(html).toContain('A browser story')
    expect(html).toContain('Browser voice playing')
    expect(html).toContain('narration-static')
    expect(html).not.toContain('audio-bars')
    expect(html).not.toContain('<i>')
  })
  test('preparing narration does not pretend to have audio measurements', () => {
    const html = renderToStaticMarkup(createElement(NarrationIndicator, {title: 'A story', status: 'preparing', source: null}))
    expect(html).toContain('Preparing narration…')
    expect(html).not.toContain('audio-bars')
  })
})

describe('artwork year metadata', () => {
  test('existing collections remain valid without years', () => {
    expect(validateDocument(createDocument()).portraits[0]!.year).toBeUndefined()
  })
  test('years survive validation and compressed backup round-trips', async () => {
    const document = createDocument()
    document.portraits[0] = {...document.portraits[0]!, year: 1924}
    const repository = new GalleryRepository
    const result = await repository.import(await repository.export(document))
    expect(result.portraits[0]!.year).toBe(1924)
  })
  for (const year of [1924.5, '', '2026', Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {value: 2026}]) {
    test(`invalid year metadata is rejected: ${JSON.stringify(year)}`, () => {
      const document = createDocument()
      expect(() => validateDocument({...document, portraits: [{...document.portraits[0], year}]})).toThrow('year')
    })
  }
})
