import {expect, test} from 'bun:test'

import renderCanvasTexture from 'canvas-textures/three'
import DisposableLifetime from 'disposable-lifetime'

import {canvasFixture} from '../../packages/canvas-textures/test/canvasFixture.ts'

test('synchronous canvas storage survives effect replay until the real final release', async () => {
  const fixture = canvasFixture()
  try {
    const texture = renderCanvasTexture({
      width: 4,
      height: 2,
      draw() {},
    })
    const lifetime = new DisposableLifetime(texture)
    const first = lifetime.retain()
    first()
    const replay = lifetime.retain()
    await Promise.resolve()
    expect(texture.image.width).toBe(4)
    expect(texture.image.height).toBe(2)
    replay()
    await Promise.resolve()
    expect(texture.image.width).toBe(0)
  } finally {
    fixture.restore()
  }
})
