import {expect, test} from 'bun:test'

test('owned rendering code imports only WebGPU Fiber and Three entry points', async () => {
  const files = new Bun.Glob('{src,packages}/**/*.{ts,tsx}')
  for await (const file of files.scan()) {
    if (file.includes('/test/') || file.includes('\\test\\')) {
      continue
    }
    const source = await Bun.file(file).text()
    expect(source).not.toMatch(/from ["'](?:three|@react-three\/drei|@react-three\/fiber\/(?:legacy|webgpu))["']/u)
    expect(source).not.toMatch(/\b(?:WebGLRenderer|meshBasicMaterial|meshStandardMaterial)\b/u)
  }
})
