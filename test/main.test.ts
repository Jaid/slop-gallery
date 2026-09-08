import {expect, test} from 'bun:test'

const {default: slopGallery} = await import('#src/main.ts')

test('should run', () => {
  const result = slopGallery()
  expect(result).toBe('slop-gallery') // TODO Test actual functionality
})
