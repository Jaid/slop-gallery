import {afterEach, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import SandboxMinimap from '../../src/components/SandboxMinimap/index.tsx'
import {cameraPose} from '../../src/lib/gallery.ts'
import sandbox from '../../src/worlds/sandbox/index.ts'

const pose = {
  position: cameraPose.position,
  direction: cameraPose.direction,
}
afterEach(() => Object.assign(cameraPose, pose))
test('the Sandbox’s map frames the Cell’s floor plan with the player on it', () => {
  cameraPose.position = [1, 1.6, -2]
  cameraPose.direction = [1, 0, 0]
  const html = renderToStaticMarkup(createElement(SandboxMinimap, {lower: false}))
  const [width, depth] = sandbox.room('cell').size
  expect(html).toContain(`viewBox="${-width / 2 - 1} ${-depth / 2 - 1} ${width + 2} ${depth + 2}"`)
  expect(html).toContain('data-room="cell"')
  expect(html).toContain(`width="${width}" height="${depth}"`)
  expect(html).toContain('translate(1 -2) rotate(90)')
})
test('the Sandbox has a single floor, so its map stays empty for the lower one', () => {
  expect(renderToStaticMarkup(createElement(SandboxMinimap, {lower: true}))).toBe('')
})
