import {expect, test} from 'bun:test'

// Behavioral ownership/readiness tests live with the reusable package. These guard game policy.
test('all generated signage uses the prepared pipeline without placeholder rasters or mipmaps', async () => {
  for (const file of ['src/components/CanvasText/index.tsx', 'src/components/levels/knottingham/KnotLabels/index.tsx', 'src/components/levels/knottingham/KnotModelSign/index.tsx']) {
    const source = await Bun.file(file).text()
    expect(source).toContain("from 'canvas-textures/react'")
    expect(source).toContain('mipmaps: false')
    expect(source).not.toMatch(/getContext|getImageData|new DataTexture|new Uint8Array|fonts\.ready/u)
  }
})
test('artwork and physical surface generation retain mipmaps and use the shared pipeline', async () => {
  for (const file of ['src/lib/loadArtworkTexture.ts', 'src/components/Scene/materials.ts', 'src/lib/materials/RoomFloorTextures.ts', 'src/components/levels/gallery/Architecture/index.tsx']) {
    const source = await Bun.file(file).text()
    expect(source).toContain("from 'canvas-textures/three'")
    expect(source).not.toContain('mipmaps: false')
    expect(source).not.toContain("getContext('2d')")
  }
  expect(await Bun.file('src/lib/texture.ts').exists()).toBe(false)
})
