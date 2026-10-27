import type {Plugin} from 'vite'

const wasmName = 'rapier.wasm'
/** Rapier’s compat build inlines its WebAssembly into the JavaScript as base64. As a file of its own, it downloads smaller, compiles while it streams in and stays in the browser’s code cache. */
const rapierWasmPlugin = (): Plugin => {
  let base = '/'
  return {
    name: 'rapier-wasm',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transform(code, id) {
      if (!/[/\\]@dimforge[/\\]rapier3d-compat[/\\]dist[/\\]rapier\.mjs$/u.test(id)) {
        return
      }
      const inlined = /[\w$]+\.toByteArray\("([\d+/A-Za-z]+=*)"\)\.buffer/u.exec(code)
      if (!inlined) {
        this.error('Rapier no longer inlines its WebAssembly the expected way.')
      }
      const reference = this.emitFile({
        type: 'asset',
        name: wasmName,
        source: Uint8Array.fromBase64(inlined[1]),
      })
      // Its initializer fetches a URL string.
      return `${code.slice(0, inlined.index)}import.meta.ROLLUP_FILE_URL_${reference}${code.slice(inlined.index + inlined[0].length)}`
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, {bundle}) {
        const asset = Object.values(bundle ?? {}).find(output => output.type === 'asset' && output.names.includes(wasmName))
        if (!asset) {
          return
        }
        // Physics only asks for it once React mounts the scene, which would leave the largest download for last.
        return [{
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'fetch',
            crossorigin: true,
            href: `${base}${asset.fileName}`,
          },
          injectTo: 'head',
        }]
      },
    },
  }
}

export default rapierWasmPlugin
