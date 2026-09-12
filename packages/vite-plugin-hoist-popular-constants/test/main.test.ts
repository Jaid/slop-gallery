import {describe, expect, test} from 'bun:test'

import vitePluginHoistPopularConstants from '../src/main.ts'

type VitePluginHoistPopularConstantsOptions = Parameters<typeof vitePluginHoistPopularConstants>[0]
const render = async (source: string, options: VitePluginHoistPopularConstantsOptions = {}) => {
  const plugin = vitePluginHoistPopularConstants(options)
  if (typeof plugin.renderChunk !== 'object') {
    throw new TypeError('Expected a renderChunk hook.')
  }
  const chunk = {
    fileName: 'chunk.js',
  } as never
  const outputOptions = {
    format: 'es',
    sourcemap: false,
  } as never
  const result = await plugin.renderChunk.handler.call({} as never, source, chunk, outputOptions, {} as never)
  if (!result) {
    return source
  }
  if (typeof result === 'string') {
    return result
  }
  if ('code' in result) {
    return String(result.code)
  }
  return result.toString()
}
describe('Vite adapter', () => {
  test('defaults to allowing byte-neutral pools for the following minifier', async () => {
    const source = 'sink("1234567","1234567")'
    expect(await render(source)).toStartWith('var _="1234567";')
    expect(await render(source, {minimumSavingsBytes: 1})).toBe(source)
  })
  test('runs as a post-build post-renderChunk plugin', () => {
    const plugin = vitePluginHoistPopularConstants()
    expect(plugin.name).toBe('hoist-popular-constants')
    expect(plugin.apply).toBe('build')
    expect(plugin.enforce).toBe('post')
    expect(typeof plugin.renderChunk).toBe('object')
    if (typeof plugin.renderChunk === 'object') {
      expect(plugin.renderChunk.order).toBe('post')
    }
  })
})
