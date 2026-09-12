import {expect, test} from 'bun:test'

import postcss from 'postcss'
import {resolveConfig} from 'vite'

test.each(['development', 'staging', 'production'])('Vite %s keeps the shared pipeline and mode-specific output', async mode => {
  const config = await resolveConfig({
    mode,
    configLoader: 'native',
  }, 'build')
  expect(config.build.outDir).toBe(mode === 'production' ? 'dist' : `out/build/${mode}`)
  expect(config.build.target).toBe('chrome153')
  expect(config.build.sourcemap).toBe(mode !== 'production')
  const fiberAlias = config.resolve.alias.find(alias => alias.find instanceof RegExp && alias.find.test('@react-three/fiber'))
  expect(fiberAlias?.replacement).toBe('@react-three/fiber/webgpu')
  if (fiberAlias?.find instanceof RegExp) {
    expect(fiberAlias.find.test('@react-three/fiber/webgpu')).toBe(false)
  }
  const relay = config.plugins.find(plugin => plugin.name === 'slop-gallery-victoria-telemetry')
  expect(relay?.configureServer).toBeFunction()
  expect(relay?.configurePreviewServer).toBeFunction()
  expect(config.plugins.some(plugin => plugin.name === 'title')).toBe(true)
  expect(config.plugins.some(plugin => plugin.name.includes('babel'))).toBe(true)
  if (mode === 'production') {
    expect(config.build.assetsDir).toBe('')
    expect(config.build.minify).toBe('terser')
  }
})
test('production CSS preserves resources and stacking levels used outside the stylesheet', async () => {
  const config = await resolveConfig({
    mode: 'production',
    configLoader: 'runner',
  }, 'build')
  const options = config.css.postcss
  if (!options || typeof options === 'string') {
    throw new Error('Expected inline PostCSS configuration.')
  }
  const result = await postcss(options.plugins).process('@font-face {font-family: ExternalFont; src: url(/font.woff2)} @keyframes externalAnimation {to {opacity: 0}} .overlay {z-index: 1000}', {from: undefined})
  expect(result.css).toContain('ExternalFont')
  expect(result.css).toContain('externalAnimation')
  expect(result.css).toContain('z-index:1000')
})
