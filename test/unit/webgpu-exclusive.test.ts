import {expect, test} from 'bun:test'

test('telemetry package exports have one React entry', async () => {
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
