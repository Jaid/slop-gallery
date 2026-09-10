import {expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import ArtworkCard from '#component/ArtworkCard'
import ArtworkDropOverlay from '#component/ArtworkDropOverlay'
import {initialPortraits} from '#src/lib/gallery/collection.ts'

test('the drop overlay distinguishes hanging, loose placement and rejected images', () => {
  for (const [rejected, valid, title] of [
    [false, false, 'Make an entrance.'],
    [false, true, 'It would look lovely here.'],
    [true, true, 'Not quite a canvas.'],
  ] as const) {
    const html = renderToStaticMarkup(createElement(ArtworkDropOverlay, {
      rejected,
      valid,
    }))
    expect(html).toContain(title)
    expect(html).toContain('data-testid="drop-overlay"')
    expect(html).not.toContain('class="undefined')
  }
})
test('an extracted artwork card retains its selection and narration controls', () => {
  const portrait = initialPortraits[0]
  const html = renderToStaticMarkup(createElement(ArtworkCard, {
    portrait,
    index: 0,
    onSelect: () => {},
  }))
  expect(html).toContain('data-testid="art-card"')
  expect(html).toContain('data-testid="art-image"')
  expect(html).toContain('Hear the story')
  expect(html).toContain('01 / ')
  expect(html).toContain(portrait.title)
})
