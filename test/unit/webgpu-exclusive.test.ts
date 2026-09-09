import type {WebgpuRendererOptions} from '#src/lib/rendering/WebgpuRenderer.ts'

import {expect, test} from 'bun:test'

import {WebgpuRenderer} from '#src/lib/rendering/WebgpuRenderer.ts'

test('native renderer propagates adapter failure without trying a fallback context', async () => {
  let fallbackCalls = 0
  let contextCalls = 0
  const canvas = {
    width: 1,
    height: 1,
    getContext: () => {
      contextCalls++
      throw new Error('Unexpected context request.')
    },
  } as unknown as HTMLCanvasElement
  // Exercise runtime behavior even when an untyped caller supplies excluded options.
  const options = {
    canvas,
    forceWebGL: true,
    getFallback: () => {
      fallbackCalls++
      throw new Error('Unexpected fallback.')
    },
  }
  const renderer = new WebgpuRenderer(options)
  const failure = new Error('WebGPU adapter unavailable.')
  renderer.backend.init = () => {
    throw failure
  }
  expect(renderer.backend.isWebGPUBackend).toBe(true)
  expect(renderer.isWebGPURenderer).toBe(true)
  await expect(renderer.init()).rejects.toBe(failure)
  expect(fallbackCalls).toBe(0)
  expect(contextCalls).toBe(0)
})
test('public renderer options and package exports do not expose compatibility switches', async () => {
  const nativeOptions: WebgpuRendererOptions = {antialias: true}
  expect(nativeOptions.antialias).toBe(true)
  // @ts-expect-error TS2353 WebGL switching is not part of the native renderer API.
  const unsupported: WebgpuRendererOptions = {forceWebGL: true}
  expect(unsupported).toBeDefined()
  for (const name of ['telemethree', 'telemethree-ego']) {
    const manifest = await Bun.file(`packages/${name}/package.json`).json() as {exports: Record<string, string>}
    expect(Object.keys(manifest.exports)).toEqual(['.', './react'])
  }
})
test('owned rendering code imports only WebGPU Fiber and Three entry points', async () => {
  const files = new Bun.Glob('{src,packages}/**/*.{ts,tsx}')
  for await (const file of files.scan()) {
    if (file.includes('/test/') || file.includes('\\test\\')) {
      continue
    }
    const source = await Bun.file(file).text()
    expect(source).not.toMatch(/from ["'](?:three|@react-three\/fiber|@react-three\/drei|@react-three\/fiber\/legacy)["']/u)
    expect(source).not.toMatch(/\b(?:CaptureRenderer|RendererInfo|WebGLRenderer|meshBasicMaterial|meshStandardMaterial)\b/u)
  }
})
