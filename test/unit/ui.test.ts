import {expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import ArtworkDropOverlay from '#component/ArtworkDropOverlay'

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
