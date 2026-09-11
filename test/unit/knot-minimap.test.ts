import {afterEach, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import KnotStudyMap from '../../src/components/levels/knottingham/KnotStudyMap/index.tsx'
import KnotGalleryMinimap from '../../src/components/levels/knottingham/Minimap/index.tsx'
import {cameraPose} from '../../src/lib/gallery.ts'
import {knotGalleryBounds, knotGallerySize} from '../../src/lib/gallery/knotGallery.ts'
import {knotExhibition} from '../../src/lib/knots/exhibition.ts'

const pose = {
  position: cameraPose.position,
  direction: cameraPose.direction,
}
afterEach(() => Object.assign(cameraPose, pose))
test('Knottingham minimap has a transparent hall outline, no visible labels and a positioned player', () => {
  cameraPose.position = [-14, 1.6, -9]
  cameraPose.direction = [1, 0, 0]
  const html = renderToStaticMarkup(createElement(KnotGalleryMinimap, {lower: false}))
  expect(html).toMatch(/<rect[^>]+fill="none"/u)
  expect(html).not.toContain('#e4e3d7')
  expect(html).not.toContain('<text')
  expect(html.match(/data-knot=/gu)).toHaveLength(knotExhibition.length)
  expect(html).toContain('translate(-14 -9) rotate(90)')
  for (const item of knotExhibition) {
    expect(html).toContain(`data-knot="${item.id}" cx="${item.position[0]}" cy="${item.position[2]}"`)
  }
})
test('the detailed map retains the model and item labels without an opaque floor', () => {
  const html = renderToStaticMarkup(createElement(KnotStudyMap))
  expect(html).toMatch(/<rect[^>]+fill="none"/u)
  expect(html).toContain('<text')
  expect(html).toContain('GLM 5.3')
  expect(html).toContain('#105')
})

test('minimap viewBox and hall outline share the dynamically sized room', () => {
  const html = renderToStaticMarkup(createElement(KnotGalleryMinimap, {lower: false}))
  expect(html).toContain(`viewBox="${knotGalleryBounds.minX - 1} ${knotGalleryBounds.northZ - 1} ${knotGallerySize[0] + 2} ${knotGallerySize[2] + 2}"`)
  expect(html).toContain(`<rect x="${knotGalleryBounds.minX}" y="${knotGalleryBounds.northZ}" width="${knotGallerySize[0]}" height="${knotGallerySize[2]}"`)
})
